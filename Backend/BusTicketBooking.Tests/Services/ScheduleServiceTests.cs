using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Xunit;

namespace BusTicketBooking.Tests.Services;

public class ScheduleServiceTests
{
    private static ScheduleService Build(AppDbContext db) =>
        new(new Repository<BusSchedule>(db),
            new Repository<Bus>(db),
            new Repository<BusRoute>(db),
            db);

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

        var fromStop = new Stop { City = "Chennai", Name = "Chennai Central" };
        var toStop   = new Stop { City = "Bangalore", Name = "Majestic" };
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

    // ── SearchAsync — departed schedules excluded ─────────────────────────────

    [Fact]
    public async Task SearchAsync_FutureSchedule_IsReturned()
    {
        var db = DbHelper.CreateInMemory();
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
        var db = DbHelper.CreateInMemory();
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
        var db = DbHelper.CreateInMemory();
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
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        var (from, to, _) = SeedSearchData(db);

        // Search in reverse direction — should return nothing
        var result = await svc.SearchAsync(to.Id, from.Id,
            DateOnly.FromDateTime(DateTime.UtcNow),
            new PagedRequestDto { Page = 1, PageSize = 10 });

        Assert.Empty(result.Items);
    }

    // ── SearchByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task SearchByKeysAsync_FutureSchedule_IsReturned()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        SeedSearchData(db, departure: DateTime.UtcNow.AddHours(2));

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0,
            Page = 1, PageSize = 10
        });

        Assert.Single(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_DepartedSchedule_IsExcluded()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        SeedSearchData(db, departure: DateTime.UtcNow.AddHours(-1));

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0,
            Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_CancelledSchedule_IsExcluded()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        SeedSearchData(db, cancelled: true);

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Chennai", ToCity = "Bangalore",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0,
            Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task SearchByKeysAsync_UnknownCity_ReturnsEmpty()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        SeedSearchData(db);

        var result = await svc.SearchByKeysAsync(new SearchSchedulesByKeysRequestDto
        {
            FromCity = "Mumbai", ToCity = "Delhi",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            UtcOffsetMinutes = 0,
            Page = 1, PageSize = 10
        });

        Assert.Empty(result.Items);
    }

    // ── GetAvailabilityAsync — seat counting ──────────────────────────────────

    [Fact]
    public async Task GetAvailabilityAsync_NoBookings_AllSeatsAvailable()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(40, result.TotalSeats);
        Assert.Equal(40, result.AvailableCount);
        Assert.Equal(0, result.BookedCount);
    }

    [Fact]
    public async Task GetAvailabilityAsync_BusMissedBooking_SeatIsAvailable()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        // Add a BusMissed booking — seat should be freed
        var user = new User { Username = "u1", Email = "u1@test.com", FullName = "U1", Role = "Customer" };
        db.Users.Add(user);
        var booking = new Booking
        {
            UserId = user.Id, ScheduleId = schedule.Id,
            Status = BookingStatus.BusMissed, TotalAmount = 500
        };
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "U1", SeatNo = "1" });
        db.SaveChanges();

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(40, result.AvailableCount); // seat freed
        Assert.DoesNotContain("1", result.BookedSeats);
    }

    [Fact]
    public async Task GetAvailabilityAsync_ConfirmedBooking_SeatIsBooked()
    {
        var db = DbHelper.CreateInMemory();
        var svc = Build(db);
        var (_, _, schedule) = SeedSearchData(db);

        var user = new User { Username = "u2", Email = "u2@test.com", FullName = "U2", Role = "Customer" };
        db.Users.Add(user);
        var booking = new Booking
        {
            UserId = user.Id, ScheduleId = schedule.Id,
            Status = BookingStatus.Confirmed, TotalAmount = 500
        };
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, Name = "U2", SeatNo = "5" });
        db.SaveChanges();

        var result = await svc.GetAvailabilityAsync(schedule.Id);

        Assert.Equal(39, result.AvailableCount);
        Assert.Contains("5", result.BookedSeats);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_PastDeparture_Throws()
    {
        var db = DbHelper.CreateInMemory();
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
}
