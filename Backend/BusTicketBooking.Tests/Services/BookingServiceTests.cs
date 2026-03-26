using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Xunit;

namespace BusTicketBooking.Tests.Services;

public class BookingServiceTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static (BookingService svc, AppDbContext db) Build(string? dbName = null)
    {
        var db = DbHelper.CreateInMemory(dbName);
        var svc = new BookingService(
            new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db);
        return (svc, db);
    }

    private static (BusOperator op, Bus bus, BusRoute route, BusSchedule schedule)
        SeedSchedule(AppDbContext db, DateTime? departure = null, bool available = true)
    {
        var op = new BusOperator { CompanyName = "Test Travels", SupportPhone = "1234567890" };
        db.BusOperators.Add(op);

        var bus = new Bus
        {
            OperatorId = op.Id,
            Code = "BUS-01",
            RegistrationNumber = "TN01AB1234",
            BusType = BusType.Seater,
            TotalSeats = 10,
            Status = available ? BusStatus.Available : BusStatus.NotAvailable
        };
        db.Buses.Add(bus);

        var route = new BusRoute { OperatorId = op.Id, RouteCode = "CHN-BLR" };
        db.BusRoutes.Add(route);

        var schedule = new BusSchedule
        {
            BusId = bus.Id,
            RouteId = route.Id,
            DepartureUtc = departure ?? DateTime.UtcNow.AddHours(2),
            BasePrice = 500
        };
        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        return (op, bus, route, schedule);
    }

    private static CreateBookingRequestDto MakeDto(Guid scheduleId, string seat = "1") =>
        new() { ScheduleId = scheduleId, Passengers = [new BookingPassengerDto { Name = "Alice", Age = 25, SeatNo = seat }] };

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidBooking_ReturnsPendingBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var result = await svc.CreateAsync(userId, MakeDto(schedule.Id));

        Assert.NotNull(result);
        Assert.Equal(BookingStatus.Pending, result.Status);
        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(userId, result.UserId);
    }

    [Fact]
    public async Task CreateAsync_DepartedSchedule_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-1));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), MakeDto(schedule.Id)));

        Assert.Contains("already departed", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_CancelledSchedule_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        schedule.IsCancelledByOperator = true;
        db.SaveChanges();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), MakeDto(schedule.Id)));

        Assert.Contains("cancelled by the operator", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_BusNotAvailable_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db, available: false);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), MakeDto(schedule.Id)));

        Assert.Contains("not available", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_DuplicateSeat_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        // First booking takes seat 1
        await svc.CreateAsync(userId, MakeDto(schedule.Id, "1"));

        // Second booking tries same seat
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), MakeDto(schedule.Id, "1")));

        Assert.Contains("already taken", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_InvalidSeat_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "999" }]
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), dto));

        Assert.Contains("Invalid seat", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_EmptyPassengers_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);

        var dto = new CreateBookingRequestDto { ScheduleId = schedule.Id, Passengers = [] };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), dto));

        Assert.Contains("passenger", ex.Message.ToLower());
    }

    [Fact]
    public async Task CreateAsync_WithValidPromo_AppliesDiscount()
    {
        var (svc, db) = Build();
        var (op, _, _, schedule) = SeedSchedule(db);

        var promo = new PromoCode
        {
            OperatorId = op.Id,
            Code = "SAVE50",
            DiscountType = 1, // flat
            DiscountValue = 50,
            MaxUses = 10,
            IsActive = true,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(30)
        };
        db.PromoCodes.Add(promo);
        db.SaveChanges();

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "1" }],
            PromoCode = "SAVE50"
        };

        var result = await svc.CreateAsync(Guid.NewGuid(), dto);

        Assert.Equal(450m, result.TotalAmount);   // 500 - 50
        Assert.Equal(50m, result.DiscountAmount);
        Assert.Equal("SAVE50", result.PromoCode);
    }

    [Fact]
    public async Task CreateAsync_WithExpiredPromo_IgnoresDiscount()
    {
        var (svc, db) = Build();
        var (op, _, _, schedule) = SeedSchedule(db);

        db.PromoCodes.Add(new PromoCode
        {
            OperatorId = op.Id,
            Code = "EXPIRED",
            DiscountType = 1,
            DiscountValue = 100,
            MaxUses = 10,
            IsActive = true,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(-1) // expired
        });
        db.SaveChanges();

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "1" }],
            PromoCode = "EXPIRED"
        };

        var result = await svc.CreateAsync(Guid.NewGuid(), dto);

        Assert.Equal(500m, result.TotalAmount); // no discount
        Assert.Equal(0m, result.DiscountAmount);
    }

    [Fact]
    public async Task CreateAsync_DuplicateSeatInSameRequest_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers =
            [
                new BookingPassengerDto { Name = "Alice", SeatNo = "1" },
                new BookingPassengerDto { Name = "Bob",   SeatNo = "1" }, // duplicate
            ]
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.CreateAsync(Guid.NewGuid(), dto));

        Assert.Contains("Duplicate seat", ex.Message);
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CancelAsync_OwnBooking_ReturnsTrue()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var booking = await svc.CreateAsync(userId, MakeDto(schedule.Id));
        var result = await svc.CancelAsync(userId, booking.Id);

        Assert.True(result);
        var updated = db.Bookings.Find(booking.Id)!;
        Assert.Equal(BookingStatus.Cancelled, updated.Status);
    }

    [Fact]
    public async Task CancelAsync_OtherUsersBooking_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var ownerId = Guid.NewGuid();

        var booking = await svc.CreateAsync(ownerId, MakeDto(schedule.Id));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => svc.CancelAsync(Guid.NewGuid(), booking.Id)); // different user
    }

    [Fact]
    public async Task CancelAsync_AlreadyCancelled_ReturnsTrue()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var booking = await svc.CreateAsync(userId, MakeDto(schedule.Id));
        await svc.CancelAsync(userId, booking.Id);

        // Cancel again — should be idempotent
        var result = await svc.CancelAsync(userId, booking.Id);
        Assert.True(result);
    }

    [Fact]
    public async Task CancelAsync_NonExistentBooking_ReturnsFalse()
    {
        var (svc, _) = Build();
        var result = await svc.CancelAsync(Guid.NewGuid(), Guid.NewGuid());
        Assert.False(result);
    }

    // ── PayAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task PayAsync_ValidBooking_SetsConfirmed()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var booking = await svc.CreateAsync(userId, MakeDto(schedule.Id));
        var result = await svc.PayAsync(userId, booking.Id, 500, "PAY-001");

        Assert.NotNull(result);
        Assert.Equal(BookingStatus.Confirmed, result.Status);
    }

    [Fact]
    public async Task PayAsync_CancelledBooking_Throws()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var booking = await svc.CreateAsync(userId, MakeDto(schedule.Id));
        await svc.CancelAsync(userId, booking.Id);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.PayAsync(userId, booking.Id, 500, "PAY-001"));
    }

    [Fact]
    public async Task PayAsync_WrongUser_ReturnsNull()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var userId = Guid.NewGuid();

        var booking = await svc.CreateAsync(userId, MakeDto(schedule.Id));
        var result = await svc.PayAsync(Guid.NewGuid(), booking.Id, 500, "PAY-001");

        Assert.Null(result);
    }

    // ── GetMyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMyAsync_ReturnsOnlyOwnBookings()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedSchedule(db);
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();

        await svc.CreateAsync(user1, MakeDto(schedule.Id, "1"));
        await svc.CreateAsync(user2, MakeDto(schedule.Id, "2"));

        var result = await svc.GetMyAsync(user1);

        Assert.Single(result);
        Assert.All(result, b => Assert.Equal(user1, b.UserId));
    }
}
