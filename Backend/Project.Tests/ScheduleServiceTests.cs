using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Repositories;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Dtos.Common;

public class ScheduleServiceTests
{
    private AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }

    private ScheduleService CreateSUT(AppDbContext db) =>
        new ScheduleService(
            new Repository<BusSchedule>(db),
            new Repository<Bus>(db),
            new Repository<BusRoute>(db),
            db
        );

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    [Fact]
    public async Task CreateAsync_Success()
    {
        var db = NewDb();
        var bus = new Bus { Id = Guid.NewGuid(), Code = "B1", TotalSeats = 40 };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = route.Id,
            BasePrice = 100,
            DepartureUtc = DateTime.UtcNow.AddHours(1),
        };

        var result = await sut.CreateAsync(dto);

        Assert.NotNull(result);
        Assert.Equal("B1", result.BusCode);
        Assert.Equal("R1", result.RouteCode);
    }

    [Fact]
    public async Task CreateAsync_BusMissing_Throws()
    {
        var db = NewDb();
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };
        db.BusRoutes.Add(route);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleRequestDto
        {
            BusId = Guid.NewGuid(),
            RouteId = route.Id,
            BasePrice = 100,
            DepartureUtc = DateTime.UtcNow.AddHours(1),
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_RouteMissing_Throws()
    {
        var db = NewDb();
        var bus = new Bus { Id = Guid.NewGuid(), Code = "X" };
        db.Buses.Add(bus);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = Guid.NewGuid(),
            BasePrice = 100,
            DepartureUtc = DateTime.UtcNow.AddHours(1),
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_PastDeparture_Throws()
    {
        var db = NewDb();
        var bus = new Bus { Id = Guid.NewGuid() };
        var route = new BusRoute { Id = Guid.NewGuid() };
        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = route.Id,
            BasePrice = 10,
            DepartureUtc = DateTime.UtcNow.AddHours(-2),
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_DuplicateDeparture_Throws()
    {
        var db = NewDb();
        var bus = new Bus { Id = Guid.NewGuid(), Code = "B2" };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R3" };
        var dep = DateTime.UtcNow.AddHours(3);

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(new BusSchedule
        {
            Id = Guid.NewGuid(),
            BusId = bus.Id,
            RouteId = route.Id,
            DepartureUtc = dep
        });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = route.Id,
            BasePrice = 100,
            DepartureUtc = dep
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    // --------------------------------------------------------
    // GET ALL
    // --------------------------------------------------------

    [Fact]
    public async Task GetAllAsync_ReturnsSorted()
    {
        var db = NewDb();

        var b = new Bus { Id = Guid.NewGuid(), Code = "B1" };
        var r = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };

        db.Buses.Add(b);
        db.BusRoutes.Add(r);

        db.BusSchedules.Add(new BusSchedule
        {
            BusId = b.Id,
            RouteId = r.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(2)
        });
        db.BusSchedules.Add(new BusSchedule
        {
            BusId = b.Id,
            RouteId = r.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(1)
        });

        db.SaveChanges();

        var sut = CreateSUT(db);

        var items = await sut.GetAllAsync();

        Assert.Equal(2, items.Count());
        Assert.True(items.First().DepartureUtc < items.Last().DepartureUtc);
    }

    // --------------------------------------------------------
    // GET BY ID
    // --------------------------------------------------------

    [Fact]
    public async Task GetByIdAsync_Found()
    {
        var db = NewDb();
        var id = Guid.NewGuid();

        var bus = new Bus { Id = Guid.NewGuid(), Code = "BC" };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "RC" };
        var sched = new BusSchedule
        {
            Id = id,
            Bus = bus,
            BusId = bus.Id,
            Route = route,
            RouteId = route.Id,
            DepartureUtc = DateTime.UtcNow
        };

        db.Add(bus);
        db.Add(route);
        db.Add(sched);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetByIdAsync(id);

        Assert.NotNull(result);
        Assert.Equal("BC", result.BusCode);
        Assert.Equal("RC", result.RouteCode);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_Success()
    {
        var db = NewDb();

        var bus1 = new Bus { Id = Guid.NewGuid(), Code = "B1" };
        var route1 = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };
        var bus2 = new Bus { Id = Guid.NewGuid(), Code = "B2" };
        var route2 = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R2" };

        db.Buses.AddRange(bus1, bus2);
        db.BusRoutes.AddRange(route1, route2);

        var sched = new BusSchedule
        {
            Id = Guid.NewGuid(),
            BusId = bus1.Id,
            RouteId = route1.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(4)
        };

        db.BusSchedules.Add(sched);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateScheduleRequestDto
        {
            BusId = bus2.Id,
            RouteId = route2.Id,
            BasePrice = 444,
            DepartureUtc = DateTime.UtcNow.AddHours(6)
        };

        var updated = await sut.UpdateAsync(sched.Id, dto);

        Assert.NotNull(updated);
        Assert.Equal("B2", updated.BusCode);
        Assert.Equal("R2", updated.RouteCode);
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new UpdateScheduleRequestDto
        {
            BusId = Guid.NewGuid(),
            RouteId = Guid.NewGuid(),
            BasePrice = 100,
            DepartureUtc = DateTime.UtcNow.AddHours(1)
        };

        var result = await sut.UpdateAsync(Guid.NewGuid(), dto);

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_Duplicate_Throws()
    {
        var db = NewDb();

        var bus = new Bus { Id = Guid.NewGuid(), Code = "B" };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R" };
        var dep = DateTime.UtcNow.AddHours(2);

        var s1 = new BusSchedule { Id = Guid.NewGuid(), BusId = bus.Id, RouteId = route.Id, DepartureUtc = dep };
        var s2 = new BusSchedule { Id = Guid.NewGuid(), BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddHours(3) };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.AddRange(s1, s2);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = route.Id,
            BasePrice = 200,
            DepartureUtc = dep
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.UpdateAsync(s2.Id, dto));
    }

    [Fact]
    public async Task UpdateAsync_PastDate_Throws()
    {
        var db = NewDb();

        var bus = new Bus { Id = Guid.NewGuid() };
        var route = new BusRoute { Id = Guid.NewGuid() };
        var s = new BusSchedule { Id = Guid.NewGuid(), BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddHours(1) };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(s);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateScheduleRequestDto
        {
            BusId = bus.Id,
            RouteId = route.Id,
            DepartureUtc = DateTime.UtcNow.AddHours(-3),
            BasePrice = 10
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.UpdateAsync(s.Id, dto));
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    [Fact]
    public async Task DeleteAsync_Success()
    {
        var db = NewDb();

        var sched = new BusSchedule { Id = Guid.NewGuid() };
        db.BusSchedules.Add(sched);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var ok = await sut.DeleteAsync(sched.Id);

        Assert.True(ok);
        Assert.Empty(db.BusSchedules.ToList());
    }

    [Fact]
    public async Task DeleteAsync_NotFound_False()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var ok = await sut.DeleteAsync(Guid.NewGuid());

        Assert.False(ok);
    }

    // --------------------------------------------------------
    // AVAILABILITY
    // --------------------------------------------------------

    [Fact]
    public async Task GetAvailabilityAsync_Success()
    {
        var db = NewDb();

        var bus = new Bus { Id = Guid.NewGuid(), TotalSeats = 5 };
        var route = new BusRoute { Id = Guid.NewGuid() };
        var sched = new BusSchedule { Id = Guid.NewGuid(), BusId = bus.Id, RouteId = route.Id, Bus = bus, Route = route };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(sched);

        var b = new Booking { Id = Guid.NewGuid(), ScheduleId = sched.Id };
        db.Bookings.Add(b);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = b.Id, SeatNo = "1" });

        db.SaveChanges();

        var sut = CreateSUT(db);

        var res = await sut.GetAvailabilityAsync(sched.Id);

        Assert.Equal(5, res.TotalSeats);
        Assert.Equal(1, res.BookedCount);
        Assert.Equal(4, res.AvailableCount);
        Assert.Contains("1", res.BookedSeats);
    }

    [Fact]
    public async Task GetAvailabilityAsync_NotFound_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.GetAvailabilityAsync(Guid.NewGuid()));
    }

    // --------------------------------------------------------
    // CREATE BY KEYS
    // --------------------------------------------------------

    [Fact]
    public async Task CreateByKeysAsync_Success()
    {
        var db = NewDb();

        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = user.Id, CompanyName = "Co" };
        var bus = new Bus { Id = Guid.NewGuid(), OperatorId = op.Id, Code = "B44" };
        var route = new BusRoute { Id = Guid.NewGuid(), OperatorId = op.Id, RouteCode = "R44" };

        db.Users.Add(user);
        db.BusOperators.Add(op);
        db.Buses.Add(bus);
        db.BusRoutes.Add(route);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleByKeysRequestDto
        {
            OperatorUsername = "op",
            BusCode = "B44",
            RouteCode = "R44",
            DepartureUtc = DateTime.UtcNow.AddHours(2),
            BasePrice = 500
        };

        var result = await sut.CreateByKeysAsync(dto);

        Assert.Equal("B44", result.BusCode);
        Assert.Equal("R44", result.RouteCode);
    }

    [Fact]
    public async Task CreateByKeysAsync_Duplicate_Throws()
    {
        var db = NewDb();

        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = user.Id };
        var bus = new Bus { Id = Guid.NewGuid(), OperatorId = op.Id, Code = "C1" };
        var route = new BusRoute { Id = Guid.NewGuid(), OperatorId = op.Id, RouteCode = "R1" };

        var dep = DateTime.UtcNow.AddHours(1);

        db.Users.Add(user);
        db.BusOperators.Add(op);
        db.Buses.Add(bus);
        db.BusRoutes.Add(route);

        db.BusSchedules.Add(new BusSchedule
        {
            Id = Guid.NewGuid(),
            BusId = bus.Id,
            RouteId = route.Id,
            DepartureUtc = dep
        });

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateScheduleByKeysRequestDto
        {
            OperatorUsername = "op",
            BusCode = "C1",
            RouteCode = "R1",
            DepartureUtc = dep,
            BasePrice = 90
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateByKeysAsync(dto));
    }

    // --------------------------------------------------------
    // GET BY BUS CODE + DEPARTURE
    // --------------------------------------------------------

    [Fact]
    public async Task GetByBusCodeAndDepartureAsync_Success()
    {
        var db = NewDb();

        var bus = new Bus { Id = Guid.NewGuid(), Code = "B7" };
        var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R7" };
        var dep = DateTime.UtcNow.AddHours(3);

        var sched = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = bus,
            BusId = bus.Id,
            Route = route,
            RouteId = route.Id,
            DepartureUtc = dep
        };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(sched);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var res = await sut.GetByBusCodeAndDepartureAsync("B7", dep);

        Assert.NotNull(res);
        Assert.Equal("B7", res.BusCode);
        Assert.Equal("R7", res.RouteCode);
    }

    [Fact]
    public async Task GetByBusCodeAndDepartureAsync_ReturnsNull()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var res = await sut.GetByBusCodeAndDepartureAsync("X", DateTime.UtcNow);

        Assert.Null(res);
    }

    // --------------------------------------------------------
    // AVAILABILITY BY KEYS
    // --------------------------------------------------------

    [Fact]
    public async Task GetAvailabilityByKeysAsync_Success()
    {
        var db = NewDb();
        var bus = new Bus { Id = Guid.NewGuid(), Code = "B88", TotalSeats = 4 };
        var route = new BusRoute { Id = Guid.NewGuid() };
        var dep = DateTime.UtcNow.AddHours(1);

        var sched = new BusSchedule
        {
            Id = Guid.NewGuid(),
            Bus = bus,
            BusId = bus.Id,
            Route = route,
            RouteId = route.Id,
            DepartureUtc = dep
        };

        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        db.BusSchedules.Add(sched);

        var bk = new Booking { Id = Guid.NewGuid(), ScheduleId = sched.Id };
        db.Bookings.Add(bk);
        db.BookingPassengers.Add(new BookingPassenger { BookingId = bk.Id, SeatNo = "2" });

        db.SaveChanges();

        var sut = CreateSUT(db);

        var res = await sut.GetAvailabilityByKeysAsync("B88", dep);

        Assert.Equal(1, res.BookedCount);
        Assert.Contains("2", res.BookedSeats);
    }

    [Fact]
    public async Task GetAvailabilityByKeysAsync_NotFound_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.GetAvailabilityByKeysAsync("NO", DateTime.UtcNow));
    }

    // --------------------------------------------------------
    // DELETE BY KEYS
    // --------------------------------------------------------

    [Fact]
    public async Task DeleteByKeysAsync_NotFound_ReturnsFalse()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var ok = await sut.DeleteByKeysAsync("XX", DateTime.UtcNow);

        Assert.False(ok);
    }
}