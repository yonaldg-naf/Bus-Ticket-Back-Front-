using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Moq;

namespace BusTicketBooking.Tests.Services
{
    public class ScheduleServiceTests
    {
        private ScheduleService CreateService(
            out AppDbContext db,
            IWalletService? wallet = null,
            string? dbName = null)
        {
            db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            wallet ??= new Mock<IWalletService>().Object;
            return new ScheduleService(
                new Repository<BusSchedule>(db),
                new Repository<Bus>(db),
                new Repository<BusRoute>(db),
                db,
                wallet);
        }

        private static Bus MakeBus(string code = "BUS001") => new()
        {
            Code = code,
            RegistrationNumber = "MH01AB1234",
            BusType = BusType.AC,
            TotalSeats = 40,
            Status = BusStatus.Available
        };

        private static BusRoute MakeRoute(string code = "R001") => new() { RouteCode = code };

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidDto_ReturnsScheduleDto()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var dto = new CreateScheduleRequestDto
            {
                BusId = bus.Id,
                RouteId = route.Id,
                DepartureUtc = DateTime.UtcNow.AddDays(1),
                BasePrice = 500
            };

            var result = await svc.CreateAsync(dto);

            Assert.Equal(bus.Id, result.BusId);
            Assert.Equal(route.Id, result.RouteId);
            Assert.Equal(500, result.BasePrice);
        }

        [Fact]
        public async Task CreateAsync_PastDeparture_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var dto = new CreateScheduleRequestDto
            {
                BusId = bus.Id,
                RouteId = route.Id,
                DepartureUtc = DateTime.UtcNow.AddDays(-1),
                BasePrice = 500
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_BusNotFound_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            var route = MakeRoute();
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var dto = new CreateScheduleRequestDto
            {
                BusId = Guid.NewGuid(),
                RouteId = route.Id,
                DepartureUtc = DateTime.UtcNow.AddDays(1),
                BasePrice = 500
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_RouteNotFound_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            db.Buses.Add(bus);
            await db.SaveChangesAsync();

            var dto = new CreateScheduleRequestDto
            {
                BusId = bus.Id,
                RouteId = Guid.NewGuid(),
                DepartureUtc = DateTime.UtcNow.AddDays(1),
                BasePrice = 500
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_DuplicateSchedule_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var dep = DateTime.SpecifyKind(DateTime.UtcNow.AddDays(1), DateTimeKind.Utc);
            db.BusSchedules.Add(new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = dep, BasePrice = 500 });
            await db.SaveChangesAsync();

            var dto = new CreateScheduleRequestDto
            {
                BusId = bus.Id,
                RouteId = route.Id,
                DepartureUtc = dep,
                BasePrice = 500
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        // ── GetAllAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsAllSchedules()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            db.BusSchedules.Add(new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 });
            db.BusSchedules.Add(new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(2), BasePrice = 400 });
            await db.SaveChangesAsync();

            var result = (await svc.GetAllAsync()).ToList();

            Assert.Equal(2, result.Count);
        }

        // ── GetByIdAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task GetByIdAsync_ExistingSchedule_ReturnsDto()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var result = await svc.GetByIdAsync(sched.Id);

            Assert.NotNull(result);
            Assert.Equal(sched.Id, result!.Id);
        }

        [Fact]
        public async Task GetByIdAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.GetByIdAsync(Guid.NewGuid());
            Assert.Null(result);
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_NoBookings_DeletesScheduleReturnsTrue()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 100 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var result = await svc.DeleteAsync(sched.Id);

            Assert.True(result);
            Assert.Empty(db.BusSchedules.ToList());
        }

        [Fact]
        public async Task DeleteAsync_NotFound_ReturnsFalse()
        {
            var svc = CreateService(out _);
            var result = await svc.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }

        [Fact]
        public async Task DeleteAsync_WithBookings_SoftDeletesSchedule()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            var user = new User { Username = "u1", Email = "u1@test.com" };
            db.Users.Add(user);
            db.Bookings.Add(new Booking { UserId = user.Id, ScheduleId = sched.Id, Status = BookingStatus.Confirmed, TotalAmount = 300 });
            await db.SaveChangesAsync();

            var result = await svc.DeleteAsync(sched.Id);

            Assert.True(result);
            Assert.True(db.BusSchedules.First().IsCancelledByAdmin);
        }

        // ── GetAvailabilityAsync ──────────────────────────────────────────────

        [Fact]
        public async Task GetAvailabilityAsync_NoBookings_AllSeatsAvailable()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus(); // 40 seats
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var result = await svc.GetAvailabilityAsync(sched.Id);

            Assert.Equal(40, result.TotalSeats);
            Assert.Equal(40, result.AvailableCount);
            Assert.Equal(0, result.BookedCount);
        }

        [Fact]
        public async Task GetAvailabilityAsync_WithBookings_ReducesAvailableSeats()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            var user = new User { Username = "u1", Email = "u1@test.com" };
            db.Users.Add(user);
            var booking = new Booking { UserId = user.Id, ScheduleId = sched.Id, Status = BookingStatus.Confirmed, TotalAmount = 300 };
            db.Bookings.Add(booking);
            db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "Alice", SeatNo = "1" });
            db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "Bob", SeatNo = "2" });
            await db.SaveChangesAsync();

            var result = await svc.GetAvailabilityAsync(sched.Id);

            Assert.Equal(2, result.BookedCount);
            Assert.Equal(38, result.AvailableCount);
        }

        [Fact]
        public async Task GetAvailabilityAsync_CancelledBookings_NotCountedAsBooked()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            var user = new User { Username = "u1", Email = "u1@test.com" };
            db.Users.Add(user);
            var booking = new Booking { UserId = user.Id, ScheduleId = sched.Id, Status = BookingStatus.Cancelled, TotalAmount = 300 };
            db.Bookings.Add(booking);
            db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "Alice", SeatNo = "1" });
            await db.SaveChangesAsync();

            var result = await svc.GetAvailabilityAsync(sched.Id);

            Assert.Equal(0, result.BookedCount);
            Assert.Equal(40, result.AvailableCount);
        }

        [Fact]
        public async Task GetAvailabilityAsync_ScheduleNotFound_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out _);
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.GetAvailabilityAsync(Guid.NewGuid()));
        }

        // ── CancelAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CancelAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.CancelAsync(Guid.NewGuid(), "reason");
            Assert.Null(result);
        }

        [Fact]
        public async Task CancelAsync_ExistingSchedule_MarksAsCancelled()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var result = await svc.CancelAsync(sched.Id, "Admin cancelled");

            Assert.NotNull(result);
            Assert.True(result!.IsCancelledByAdmin);
            Assert.Equal("Admin cancelled", result.CancelReason);
        }

        [Fact]
        public async Task CancelAsync_WithPaidBookings_IssuesWalletRefunds()
        {
            var mockWallet = new Mock<IWalletService>();
            var svc = CreateService(out var db, wallet: mockWallet.Object);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            var user = new User { Username = "u1", Email = "u1@test.com" };
            db.Users.Add(user);
            var booking = new Booking { UserId = user.Id, ScheduleId = sched.Id, Status = BookingStatus.Confirmed, TotalAmount = 300 };
            db.Bookings.Add(booking);
            db.Payments.Add(new Payment { BookingId = booking.Id, Amount = 300, Status = PaymentStatus.Success, ProviderReference = "REF" });
            await db.SaveChangesAsync();

            await svc.CancelAsync(sched.Id, "Admin cancelled");

            mockWallet.Verify(w => w.CreditAsync(user.Id, 300, "AdminCancelRefund",
                It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var dto = new UpdateScheduleRequestDto
            {
                DepartureLocal = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-ddTHH:mm"),
                TimeZoneId = "UTC",
                BasePrice = 600
            };
            var result = await svc.UpdateAsync(Guid.NewGuid(), dto);
            Assert.Null(result);
        }

        [Fact]
        public async Task UpdateAsync_ValidData_UpdatesSchedule()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var newDep = DateTime.UtcNow.AddDays(3);
            var dto = new UpdateScheduleRequestDto
            {
                DepartureLocal = newDep.ToString("yyyy-MM-ddTHH:mm"),
                TimeZoneId = "UTC",
                BasePrice = 750
            };

            var result = await svc.UpdateAsync(sched.Id, dto);

            Assert.NotNull(result);
            Assert.Equal(750, result!.BasePrice);
        }

        [Fact]
        public async Task UpdateAsync_PastDeparture_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            var bus = MakeBus();
            var route = MakeRoute();
            db.Buses.Add(bus);
            db.BusRoutes.Add(route);
            var sched = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddDays(1), BasePrice = 300 };
            db.BusSchedules.Add(sched);
            await db.SaveChangesAsync();

            var dto = new UpdateScheduleRequestDto
            {
                DepartureLocal = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:mm"),
                TimeZoneId = "UTC",
                BasePrice = 300
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.UpdateAsync(sched.Id, dto));
        }
    }
}
