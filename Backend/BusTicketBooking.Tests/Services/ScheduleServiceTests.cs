using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class ScheduleServiceTests
{
    private static ScheduleService Build(AppDbContext db) =>
        new(new Repository<BusSchedule>(db),
            new Repository<Bus>(db),
            new Repository<BusRoute>(db),
            db,
            new WalletService(
                new Repository<BusTicketBooking.Models.Wallet>(db),
                new Repository<BusTicketBooking.Models.WalletTransaction>(db)));

    private static (Stop from, Stop to, BusSchedule schedule) SeedSearchData(
        AppDbContext db, DateTime? departure = null, bool cancelled = false)
    {
        var bus = SeedHelper.MakeBus();
        db.Buses.Add(bus);

        var fromStop = new Stop { City = "Chennai",   Name = "Chennai Central" };
        var toStop   = new Stop { City = "Bangalore", Name = "Majestic" };
        db.Stops.AddRange(fromStop, toStop);

        var route = SeedHelper.MakeRoute();
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

    // ── SearchByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task Search_FutureSchedule_IsReturned()
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
    public async Task Search_DepartedSchedule_IsExcluded()
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
    public async Task Search_CancelledSchedule_IsExcluded()
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
    public async Task Search_WrongDirection_IsExcluded()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedSearchData(db);

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Bangalore", ToCity = "Chennai",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0, Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task Search_UnknownCity_ReturnsEmpty()
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
    public async Task GetAvailability_NoBookings_AllSeatsAvailable()
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
    public async Task GetAvailability_ConfirmedBooking_SeatIsBooked()
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
    public async Task GetAvailability_CancelledBooking_SeatIsFreed()
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
    public async Task Create_PastDeparture_Throws()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var bus   = SeedHelper.MakeBus();
        var route = SeedHelper.MakeRoute();
        db.Buses.Add(bus); db.BusRoutes.Add(route); db.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(new CreateScheduleRequestDto
        {
            BusId = bus.Id, RouteId = route.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(-2), BasePrice = 100
        }));
    }

    [Fact]
    public async Task Create_DuplicateDeparture_Throws()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var bus   = SeedHelper.MakeBus();
        var route = SeedHelper.MakeRoute();
        db.Buses.Add(bus); db.BusRoutes.Add(route);
        var dep = new DateTime(DateTime.UtcNow.AddHours(5).Ticks / TimeSpan.TicksPerSecond * TimeSpan.TicksPerSecond, DateTimeKind.Utc);
        db.BusSchedules.Add(new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = dep, BasePrice = 200 });
        db.SaveChanges();

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(new CreateScheduleRequestDto
        {
            BusId = bus.Id, RouteId = route.Id, DepartureUtc = dep, BasePrice = 200
        }));
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Cancel_IssuesFullRefund_ToAllConfirmedBookings()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db, departure: DateTime.UtcNow.AddHours(10));

        var userId  = Guid.NewGuid();
        var user    = new User { Id = userId, Username = "cu1", Email = "cu1@t.com", FullName = "CU1", Role = "Customer", PasswordHash = "x" };
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
    public async Task Cancel_ReturnsNull_WhenScheduleNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.CancelAsync(Guid.NewGuid(), "reason");
        Assert.Null(result);
    }
}
