using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Moq;

namespace BusTicketBooking.Tests.Services
{
    public class BookingServiceTests
    {
        /// <summary>
        /// Creates a BookingService backed by the SAME AppDbContext for both
        /// the generic repositories and the direct _db queries, so that
        /// LoadForResponse can find entities written by the repositories.
        /// </summary>
        private (BookingService svc, AppDbContext db, Mock<IWalletService> walletMock) CreateService(string? dbName = null)
        {
            var db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            var walletMock = new Mock<IWalletService>();
            walletMock.Setup(w => w.DebitAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var svc = new BookingService(
                new Repository<Booking>(db),
                new Repository<BookingPassenger>(db),
                new Repository<Payment>(db),
                new Repository<BusSchedule>(db),
                db,
                walletMock.Object);

            return (svc, db, walletMock);
        }

        private static (Bus bus, BusRoute route, BusSchedule schedule, User user) SeedBasicData(
            AppDbContext db,
            DateTime? departure = null,
            bool isCancelled = false,
            BusStatus busStatus = BusStatus.Available)
        {
            var bus = new Bus
            {
                Code = "BUS001",
                RegistrationNumber = "MH01AB1234",
                BusType = BusType.AC,
                TotalSeats = 40,
                Status = busStatus
            };
            var route = new BusRoute { RouteCode = "R001" };
            var schedule = new BusSchedule
            {
                BusId = bus.Id,
                RouteId = route.Id,
                DepartureUtc = departure ?? DateTime.UtcNow.AddDays(2),
                BasePrice = 500,
                IsCancelledByAdmin = isCancelled
            };
            var user = new User { Username = "alice", Email = "alice@test.com" };

            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            db.BusSchedules.Add(schedule);
            db.Users.Add(user);
            db.SaveChanges();

            return (bus, route, schedule, user);
        }

        private static CreateBookingRequestDto MakeBookingDto(Guid scheduleId, params string[] seats)
        {
            return new CreateBookingRequestDto
            {
                ScheduleId = scheduleId,
                Passengers = seats.Select((s, i) => new BookingPassengerDto
                {
                    Name = $"Passenger{i + 1}",
                    Age = 25,
                    SeatNo = s
                }).ToList()
            };
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidRequest_CreatesBookingPending()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var dto = MakeBookingDto(schedule.Id, "1", "2");
            var result = await svc.CreateAsync(user.Id, dto);

            Assert.Equal(BookingStatus.Pending, result.Status);
            Assert.Equal(1000, result.TotalAmount); // 500 * 2
            Assert.Equal(2, result.Passengers.Count);
        }

        [Fact]
        public async Task CreateAsync_NoPassengers_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var dto = new CreateBookingRequestDto { ScheduleId = schedule.Id, Passengers = new List<BookingPassengerDto>() };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_DuplicateSeatInRequest_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var dto = MakeBookingDto(schedule.Id, "5", "5");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_ScheduleNotFound_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, _, user) = SeedBasicData(db);

            var dto = MakeBookingDto(Guid.NewGuid(), "1");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_CancelledSchedule_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, isCancelled: true);

            var dto = MakeBookingDto(schedule.Id, "1");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_DepartedSchedule_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddDays(-1));

            var dto = MakeBookingDto(schedule.Id, "1");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_BusUnderRepair_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, busStatus: BusStatus.UnderRepair);

            var dto = MakeBookingDto(schedule.Id, "1");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_BusNotAvailable_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, busStatus: BusStatus.NotAvailable);

            var dto = MakeBookingDto(schedule.Id, "1");

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_InvalidSeatNumber_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var dto = MakeBookingDto(schedule.Id, "99"); // bus has 40 seats

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        [Fact]
        public async Task CreateAsync_AlreadyTakenSeat_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            // First booking takes seat 1
            await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));

            // Second booking tries to take seat 1 again
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1")));
        }

        [Fact]
        public async Task CreateAsync_EmptySeatNo_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var dto = new CreateBookingRequestDto
            {
                ScheduleId = schedule.Id,
                Passengers = new List<BookingPassengerDto> { new() { Name = "Alice", SeatNo = "  " } }
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(user.Id, dto));
        }

        // ── GetMyAsync ────────────────────────────────────────────────────────

        [Fact]
        public async Task GetMyAsync_ReturnsOnlyUserBookings()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);
            var otherUser = new User { Username = "bob", Email = "bob@test.com" };
            db.Users.Add(otherUser);
            await db.SaveChangesAsync();

            await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.CreateAsync(otherUser.Id, MakeBookingDto(schedule.Id, "2"));

            var result = (await svc.GetMyAsync(user.Id)).ToList();

            Assert.Single(result);
            Assert.Equal(user.Id, result[0].UserId);
        }

        [Fact]
        public async Task GetMyAsync_ConfirmedBooking_CalculatesRefundPolicy()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddDays(3));

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.PayAsync(user.Id, booking.Id, 500, "REF123");

            var result = (await svc.GetMyAsync(user.Id)).First();

            Assert.Equal(100, result.RefundPercent); // 3 days = 48h+
            Assert.NotNull(result.RefundPolicy);
        }

        // ── GetByIdForUserAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetByIdForUserAsync_OwnerCanAccess()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.GetByIdForUserAsync(user.Id, booking.Id);

            Assert.NotNull(result);
            Assert.Equal(booking.Id, result!.Id);
        }

        [Fact]
        public async Task GetByIdForUserAsync_OtherUserCannotAccess()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.GetByIdForUserAsync(Guid.NewGuid(), booking.Id);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetByIdForUserAsync_AdminCanAccessAnyBooking()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.GetByIdForUserAsync(Guid.NewGuid(), booking.Id, allowPrivileged: true);

            Assert.NotNull(result);
        }

        [Fact]
        public async Task GetByIdForUserAsync_NotFound_ReturnsNull()
        {
            var (svc, _, _) = CreateService();
            var result = await svc.GetByIdForUserAsync(Guid.NewGuid(), Guid.NewGuid());
            Assert.Null(result);
        }

        // ── CancelAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CancelAsync_PendingBooking_CancelledNoRefund()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.CancelAsync(user.Id, booking.Id);

            Assert.True(result);
            walletMock.Verify(w => w.CreditAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task CancelAsync_ConfirmedPaidBooking_48hPlus_FullRefund()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddDays(3));

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.PayAsync(user.Id, booking.Id, 500, "REF");

            await svc.CancelAsync(user.Id, booking.Id);

            walletMock.Verify(w => w.CreditAsync(user.Id, 500, "CancellationRefund",
                booking.Id, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CancelAsync_ConfirmedPaidBooking_24to48h_75PercentRefund()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddHours(36));

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.PayAsync(user.Id, booking.Id, 500, "REF");

            await svc.CancelAsync(user.Id, booking.Id);

            walletMock.Verify(w => w.CreditAsync(user.Id, 375, "CancellationRefund",
                booking.Id, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CancelAsync_ConfirmedPaidBooking_6to24h_50PercentRefund()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddHours(12));

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.PayAsync(user.Id, booking.Id, 500, "REF");

            await svc.CancelAsync(user.Id, booking.Id);

            walletMock.Verify(w => w.CreditAsync(user.Id, 250, "CancellationRefund",
                booking.Id, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CancelAsync_ConfirmedPaidBooking_0to6h_25PercentRefund()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db, departure: DateTime.UtcNow.AddHours(3));

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.PayAsync(user.Id, booking.Id, 500, "REF");

            await svc.CancelAsync(user.Id, booking.Id);

            walletMock.Verify(w => w.CreditAsync(user.Id, 125, "CancellationRefund",
                booking.Id, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CancelAsync_AlreadyCancelled_ReturnsTrueIdempotent()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.CancelAsync(user.Id, booking.Id);

            var result = await svc.CancelAsync(user.Id, booking.Id);

            Assert.True(result);
        }

        [Fact]
        public async Task CancelAsync_NotFound_ReturnsFalse()
        {
            var (svc, _, _) = CreateService();
            var result = await svc.CancelAsync(Guid.NewGuid(), Guid.NewGuid());
            Assert.False(result);
        }

        [Fact]
        public async Task CancelAsync_OtherUserNotPrivileged_ThrowsUnauthorizedAccessException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));

            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                svc.CancelAsync(Guid.NewGuid(), booking.Id, allowPrivileged: false));
        }

        // ── PayAsync ──────────────────────────────────────────────────────────

        [Fact]
        public async Task PayAsync_GatewayPayment_ConfirmsBooking()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.PayAsync(user.Id, booking.Id, 500, "GATEWAY-REF");

            Assert.NotNull(result);
            Assert.Equal(BookingStatus.Confirmed, result!.Status);
        }

        [Fact]
        public async Task PayAsync_WalletPayment_DebitsWalletAndConfirms()
        {
            var (svc, db, walletMock) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.PayAsync(user.Id, booking.Id, 500, "", useWallet: true);

            Assert.NotNull(result);
            Assert.Equal(BookingStatus.Confirmed, result!.Status);
            walletMock.Verify(w => w.DebitAsync(user.Id, 500, "BookingPayment",
                booking.Id, It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task PayAsync_WalletInsufficientBalance_ThrowsInvalidOperationException()
        {
            var (svc, db, walletMock) = CreateService();
            walletMock.Setup(w => w.DebitAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<string>(),
                It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

            var (_, _, schedule, user) = SeedBasicData(db);
            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                svc.PayAsync(user.Id, booking.Id, 500, "", useWallet: true));
        }

        [Fact]
        public async Task PayAsync_CancelledBooking_ThrowsInvalidOperationException()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            await svc.CancelAsync(user.Id, booking.Id);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                svc.PayAsync(user.Id, booking.Id, 500, "REF"));
        }

        [Fact]
        public async Task PayAsync_NotFound_ReturnsNull()
        {
            var (svc, _, _) = CreateService();
            var result = await svc.PayAsync(Guid.NewGuid(), Guid.NewGuid(), 500, "REF");
            Assert.Null(result);
        }

        [Fact]
        public async Task PayAsync_OtherUserNotPrivileged_ReturnsNull()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.PayAsync(Guid.NewGuid(), booking.Id, 500, "REF");

            Assert.Null(result);
        }

        [Fact]
        public async Task PayAsync_ZeroAmount_UsesBookingTotal()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.PayAsync(user.Id, booking.Id, 0, "REF");

            Assert.NotNull(result);
            Assert.Equal(BookingStatus.Confirmed, result!.Status);
        }

        [Fact]
        public async Task PayAsync_AdminPrivileged_CanPayAnyBooking()
        {
            var (svc, db, _) = CreateService();
            var (_, _, schedule, user) = SeedBasicData(db);

            var booking = await svc.CreateAsync(user.Id, MakeBookingDto(schedule.Id, "1"));
            var result = await svc.PayAsync(Guid.NewGuid(), booking.Id, 500, "REF", allowPrivileged: true);

            Assert.NotNull(result);
            Assert.Equal(BookingStatus.Confirmed, result!.Status);
        }
    }
}
