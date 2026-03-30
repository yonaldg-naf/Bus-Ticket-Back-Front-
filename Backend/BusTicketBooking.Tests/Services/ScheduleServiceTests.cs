using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class ScheduleServiceTests
{
    // ScheduleService requires WalletService for schedule cancellation refunds
    private static ScheduleService Build(AppDbContext db) =>
        new(new Repository<BusSchedule>(db),
            new Repository<Bus>(db),
            new Repository<BusRoute>(db),
            db,
            new WalletService(db));

    // Seeds a full route with two stops so SearchAsync can find it
    private static (Stop from, Stop to, BusSchedule schedule) SeedSearchData(
        AppDbContext db, DateTime? departure = null, bool cancelled = false)
    {
        var op = new BusOperator { CompanyName = "Travels", SupportPhone = "123" };
        db.BusOperators.Add(op);

        var bus = new Bus
        {
            OperatorId = op.Id, Code = "B1", RegistrationNumber = "TN01",
            BusType = BusType.Seater, TotalSeats = 40, Status = BusStatus.Available
        };
        db.Buses.Add(bus);

        var fromStop = new Stop { City = "Chennai",    Name = "Chennai Central" };
        var toStop   = new Stop { City = "Bangalore",  Name = "Majestic" };
        db.Stops.AddRange(fromStop, toStop);

        var route = new BusRoute { OperatorId = op.Id, RouteCode = "CHN-BLR" };
        db.BusRoutes.Add(route);
        db.SaveChanges();

        db.RouteStops.AddRange(
            new RouteStop { RouteId = route.Id, StopId = fromStop.Id, Order = 1 },
            new RouteStop { RouteId = route.Id, StopId = toStop.Id,   Order = 2 }
        );

        var dep = departure ?? DateTime.UtcNow.AddHours(3);
        var schedule = new BusSchedule
        {
            BusId = bus.Id, RouteId = route.Id,
            DepartureUtc = dep, BasePrice = 500,
            IsCancelledByOperator = cancelled
        };
        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        return (fromStop, toStop, schedule);
    }

    // ── SearchAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SearchAsync_FutureSchedule_IsReturned()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (from, to, _) = SeedSearchData(db, departure: DateTime.UtcNow.AddHours(2));

        var result = await svc.SearchAsync(from.Id, to.Id,
            DateOnly.FromDateTime(DateTime.UtcNow),
            new PagedRequestDto { Page = 1, PageSize = 10 });

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task SearchAsync_DepartedSchedule_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (from, to, _) = SeedSearchData(db, departure: DateTime.UtcNow.AddHours(-1));

        var result = await svc.SearchAsync(from.Id, to.Id,
            DateOnly.FromDateTime(DateTime.UtcNow),
            new PagedRequestDto { Page = 1, PageSize = 10 });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchAsync_CancelledSchedule_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (from, to, _) = SeedSearchData(db, cancelled: true);

        var result = await svc.SearchAsync(from.Id, to.Id,
            DateOnly.FromDateTime(DateTime.UtcNow),
            new PagedRequestDto { Page = 1, PageSize = 10 });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchAsync_WrongDirection_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (from, to, _) = SeedSearchData(db);

        // Searching in reverse direction — should return nothing
        var result = await svc.SearchAsync(to.Id, from.Id,
            DateOnly.FromDateTime(DateTime.UtcNow),
            new PagedRequestDto { Page = 1, PageSize = 10 });

        Assert.Empty(result.Items);
    }

    // ── SearchByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task SearchByKeysAsync_FutureSchedule_IsReturned()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedSearchData(db, departure: DateTime.UtcNow.AddHours(2));

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0, Page = 1, PageSize = 10
        });

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_DepartedSchedule_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedSearchData(db, departure: DateTime.UtcNow.AddHours(-1));

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0, Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_CancelledSchedule_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedSearchData(db, cancelled: true);

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0, Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_UnknownCity_ReturnsEmpty()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedSearchData(db);

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Mumbai", ToCity = "Delhi",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0, Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    // ── GetAvailabilityAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task GetAvailabilityAsync_NoBookings_AllSeatsAvailable()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(40, result.TotalSeats);
        Assert.Equal(40, result.AvailableCount);
        Assert.Equal(0,  result.BookedCount);
    }

    [Fact]
    public async Task GetAvailabilityAsync_ConfirmedBooking_SeatIsBooked()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var user = new User { Username = "u2", Email = "u2@test.com", FullName = "U2", Role = "Customer", PasswordHash = "x" };
        db.Users.Add(user);
        var booking = new Booking { UserId = user.Id, ScheduleId = schedule.Id, Status = BookingStatus.Confirmed, TotalAmount = 500 };
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "U2", SeatNo = "5" });
        db.SaveChanges();

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(39, result.AvailableCount);
        Assert.Contains("5", result.BookedSeats);
    }

    [Fact]
    public async Task GetAvailabilityAsync_BusMissedBooking_SeatIsFreed()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var user = new User { Username = "u3", Email = "u3@test.com", FullName = "U3", Role = "Customer", PasswordHash = "x" };
        db.Users.Add(user);
        var booking = new Booking { UserId = user.Id, ScheduleId = schedule.Id, Status = BookingStatus.BusMissed, TotalAmount = 500 };
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "U3", SeatNo = "1" });
        db.SaveChanges();

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        // BusMissed seats are freed — all 40 available
        Assert.Equal(40, result.AvailableCount);
        Assert.DoesNotContain("1", result.BookedSeats);
    }

    [Fact]
    public async Task GetAvailabilityAsync_CancelledBooking_SeatIsFreed()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var user = new User { Username = "u4", Email = "u4@test.com", FullName = "U4", Role = "Customer", PasswordHash = "x" };
        db.Users.Add(user);
        var booking = new Booking { UserId = user.Id, ScheduleId = schedule.Id, Status = BookingStatus.Cancelled, TotalAmount = 500 };
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "U4", SeatNo = "3" });
        db.SaveChanges();

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(40, result.AvailableCount);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PastDeparture_Throws()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var op = new BusOperator { CompanyName = "T", SupportPhone = "1" };
        db.BusOperators.Add(op);
        var bus = new Bus { OperatorId = op.Id, Code = "B1", RegistrationNumber = "R1", BusType = BusType.Seater, TotalSeats = 10, Status = BusStatus.Available };
        db.Buses.Add(bus);
        var route = new BusRoute { OperatorId = op.Id, RouteCode = "A-B" };
        db.BusRoutes.Add(route);
        db.SaveChanges();

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id, RouteId = route.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(-2),
            BasePrice = 100
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_DuplicateDeparture_Throws()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var op = new BusOperator { CompanyName = "T", SupportPhone = "1" };
        db.BusOperators.Add(op);
        var bus = new Bus { OperatorId = op.Id, Code = "B2", RegistrationNumber = "R2", BusType = BusType.Seater, TotalSeats = 10, Status = BusStatus.Available };
        db.Buses.Add(bus);
        var route = new BusRoute { OperatorId = op.Id, RouteCode = "A-C" };
        db.BusRoutes.Add(route);
        var dep = DateTime.UtcNow.AddHours(5);
        dep = new DateTime(dep.Year, dep.Month, dep.Day, dep.Hour, dep.Minute, dep.Second, DateTimeKind.Utc);
        db.BusSchedules.Add(new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = dep, BasePrice = 200 });
        db.SaveChanges();

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id, RouteId = route.Id,
            DepartureUtc = dep, BasePrice = 200
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CancelAsync_IssuesFullRefund_ToAllConfirmedBookings()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db, departure: DateTime.UtcNow.AddHours(10));

        var userId = Guid.NewGuid();
        var user   = new User { Id = userId, Username = "cu1", Email = "cu1@t.com", FullName = "CU1", Role = "Customer", PasswordHash = "x" };
        db.Users.Add(user);

        var booking = new Booking { UserId = userId, ScheduleId = schedule.Id, Status = BookingStatus.Confirmed, TotalAmount = 600 };
        var payment = new Payment { BookingId = booking.Id, Amount = 600, Status = PaymentStatus.Success, ProviderReference = "P1" };
        booking.Payment = payment;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        db.SaveChanges();

        await svc.CancelAsync(schedule.Id, "Route change");

        var updatedBooking = db.Bookings.Find(booking.Id)!;
        Assert.Equal(BookingStatus.OperatorCancelled, updatedBooking.Status);

        var wallet = db.Wallets.SingleOrDefault(w => w.UserId == userId);
        Assert.NotNull(wallet);
        Assert.Equal(600m, wallet!.Balance);
    }

    [Fact]
    public async Task CancelAsync_ReturnsNull_WhenScheduleNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.CancelAsync(Guid.NewGuid(), "reason");
        Assert.Null(result);
    }
}
