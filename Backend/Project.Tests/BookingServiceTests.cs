using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Dtos.Bookings;

public class BookingServiceTests
{
    private AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    private BookingService CreateSUT(AppDbContext db) =>
        new BookingService(
            new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db
        );

    // -------------------------------------------------------
    // CREATE — SUCCESS
    // -------------------------------------------------------

    [Fact]
    public async Task CreateAsync_SuccessfulBooking()
    {
        var db = NewDb();
        var schedule = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" },
            Bus = new Bus { TotalSeats = 40, Status = BusStatus.Available, Code = "B1" },
            BasePrice = 200,
            DepartureUtc = DateTime.UtcNow.AddHours(1)
        };

        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = { new BookingPassengerDto { Name = "A", Age = 20, SeatNo = "1" } }
        };

        var result = await sut.CreateAsync(Guid.NewGuid(), dto);

        Assert.NotNull(result);
        Assert.Equal(200, result.TotalAmount);
        Assert.Single(result.Passengers);
    }

    // -------------------------------------------------------
    // CREATE — FAILURE CASES
    // -------------------------------------------------------

    [Fact]
    public async Task CreateAsync_NoPassengers_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto { Passengers = new() };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task CreateAsync_DuplicateSeat_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = Guid.NewGuid(),
            Passengers =
            {
                new() { Name="A", Age=20, SeatNo="1" },
                new() { Name="B", Age=30, SeatNo="1" }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task CreateAsync_ScheduleNotFound_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = Guid.NewGuid(),
            Passengers = { new() { Name = "A", Age = 20, SeatNo = "1" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task CreateAsync_BusUnavailable_Throws()
    {
        var db = NewDb();
        var schedule = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = new Bus { Status = BusStatus.NotAvailable, TotalSeats = 40 },
            Route = new BusRoute { RouteCode = "R1" },
            BasePrice = 100
        };

        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = { new() { Name = "A", Age = 21, SeatNo = "1" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task CreateAsync_InvalidSeat_Throws()
    {
        var db = NewDb();
        var schedule = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Route = new BusRoute(),
            Bus = new Bus { TotalSeats = 40, Status = BusStatus.Available },
            BasePrice = 100
        };

        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = { new() { Name = "A", Age = 20, SeatNo = "999" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task CreateAsync_SeatTaken_Throws()
    {
        var db = NewDb();
        var schedule = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = new Bus { TotalSeats = 40, Status = BusStatus.Available },
            Route = new BusRoute(),
            BasePrice = 100
        };

        var booking = new Booking { Id = Guid.NewGuid(), ScheduleId = schedule.Id };
        db.BusSchedules.Add(schedule);
        db.Bookings.Add(booking);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = booking.Id, SeatNo = "1" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateBookingRequestDto
        {
            ScheduleId = schedule.Id,
            Passengers = { new() { Name = "A", Age = 20, SeatNo = "1" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(Guid.NewGuid(), dto));
    }

    // -------------------------------------------------------
    // GET MY BOOKINGS
    // -------------------------------------------------------

    [Fact]
    public async Task GetMyAsync_ReturnsOnlyUserBookings()
    {
        var db = NewDb();
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();

        // schedule (same for both users)
        var bus = new Bus { Id = Guid.NewGuid(), Code = "B1", RegistrationNumber = "RN1" };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };
        var sched = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = bus,
            BusId = bus.Id,
            Route = route,
            RouteId = route.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(1)
        };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(sched);

        db.Bookings.Add(new Booking { UserId = user1, Schedule = sched, ScheduleId = sched.Id });
        db.Bookings.Add(new Booking { UserId = user2, Schedule = sched, ScheduleId = sched.Id });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetMyAsync(user1);

        Assert.Single(result);
    }

    // -------------------------------------------------------
    // GET BY ID (SECURITY)
    // -------------------------------------------------------

    [Fact]
    public async Task GetByIdForUserAsync_ReturnsBooking_ForOwner()
    {
        var db = NewDb();
        var userId = Guid.NewGuid();

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Schedule = new BusSchedule { Bus = new Bus(), Route = new BusRoute() }
        };

        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);
        var result = await sut.GetByIdForUserAsync(userId, booking.Id);

        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetByIdForUserAsync_WrongUser_ReturnsNull()
    {
        var db = NewDb();
        var booking = new Booking { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Schedule = new BusSchedule { Bus = new Bus(), Route = new BusRoute() } };

        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);
        var result = await sut.GetByIdForUserAsync(Guid.NewGuid(), booking.Id);

        Assert.Null(result);
    }

    // -------------------------------------------------------
    // CANCEL
    // -------------------------------------------------------

    [Fact]
    public async Task CancelAsync_Success()
    {
        var db = NewDb();
        var userId = Guid.NewGuid();

        var booking = new Booking { Id = Guid.NewGuid(), UserId = userId, Status = BookingStatus.Pending };
        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.CancelAsync(userId, booking.Id);

        Assert.True(result);
        Assert.Equal(BookingStatus.Cancelled, booking.Status);
    }

    [Fact]
    public async Task CancelAsync_WrongUser_Throws()
    {
        var db = NewDb();
        var booking = new Booking { Id = Guid.NewGuid(), UserId = Guid.NewGuid() };

        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            sut.CancelAsync(Guid.NewGuid(), booking.Id));
    }

    [Fact]
    public async Task CancelAsync_NotFound_ReturnsFalse()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.CancelAsync(Guid.NewGuid(), Guid.NewGuid());

        Assert.False(result);
    }

    // -------------------------------------------------------
    // PAY
    // -------------------------------------------------------

    [Fact]
    public async Task PayAsync_CancelledBooking_Throws()
    {
        var db = NewDb();
        var userId = Guid.NewGuid();

        var schedule = new BusSchedule { Bus = new Bus(), Route = new BusRoute() };

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = BookingStatus.Cancelled,
            Schedule = schedule
        };

        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.PayAsync(userId, booking.Id, 100, "REF"));
    }

    [Fact]
    public async Task PayAsync_WrongUser_ReturnsNull()
    {
        var db = NewDb();

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Schedule = new BusSchedule { Bus = new Bus(), Route = new BusRoute() }
        };

        db.Bookings.Add(booking);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.PayAsync(Guid.NewGuid(), booking.Id, 100, "X");

        Assert.Null(result);
    }

    [Fact]
    public async Task PayAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.PayAsync(Guid.NewGuid(), Guid.NewGuid(), 100, "X");

        Assert.Null(result);
    }

    // -------------------------------------------------------
    // CREATE BY KEYS
    // -------------------------------------------------------

    [Fact]
    public async Task CreateByKeysAsync_Success()
    {
        var db = NewDb();
        var departure = DateTime.UtcNow.AddHours(1);

        var schedule = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = new Bus { Code = "B1", Status = BusStatus.Available, TotalSeats = 40 },
            Route = new BusRoute(),
            DepartureUtc = departure,
            BasePrice = 200
        };

        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateBookingByKeysRequestDto
        {
            BusCode = "B1",
            DepartureUtc = departure,
            Passengers = { new() { Name = "A", Age = 20, SeatNo = "1" } }
        };

        var result = await sut.CreateByKeysAsync(Guid.NewGuid(), dto);

        Assert.NotNull(result);
        Assert.Equal("B1", result.BusCode);
    }

    [Fact]
    public async Task CreateByKeysAsync_ScheduleMissing_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateBookingByKeysRequestDto
        {
            BusCode = "X",
            DepartureUtc = DateTime.UtcNow.AddHours(1),
            Passengers = { new() { Name = "A", Age = 20, SeatNo = "1" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateByKeysAsync(Guid.NewGuid(), dto));
    }
}