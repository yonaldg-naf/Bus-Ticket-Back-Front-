using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Services;
using BusTicketBooking.Repositories;
using BusTicketBooking.Models;
using BusTicketBooking.Dtos.Routes;

public class RouteServiceTests
{
    private AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    private RouteService CreateSUT(AppDbContext db) =>
        new RouteService(
            new Repository<BusRoute>(db),
            new Repository<RouteStop>(db),
            new Repository<Stop>(db),
            new Repository<BusOperator>(db),
            new Repository<User>(db),
            db
        );

    // ------------------------------------------------------------
    // CREATE (ID-BASED)
    // ------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_Success()
    {
        var db = NewDb();
        var operatorId = Guid.NewGuid();

        var s1 = new Stop { Id = Guid.NewGuid(), City = "A", Name = "X" };
        var s2 = new Stop { Id = Guid.NewGuid(), City = "B", Name = "Y" };

        db.Stops.AddRange(s1, s2);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = operatorId,
            RouteCode = "R99",
            Stops =
            {
                new() { StopId = s1.Id, Order = 1 },
                new() { StopId = s2.Id, Order = 2 }
            }
        };

        var result = await sut.CreateAsync(dto);

        Assert.Equal("R99", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
    }

    [Fact]
    public async Task CreateAsync_DuplicateRouteCode_Throws()
    {
        var db = NewDb();
        var opId = Guid.NewGuid();

        db.BusRoutes.Add(new BusRoute { Id = Guid.NewGuid(), OperatorId = opId, RouteCode = "DUP" });

        var stop = new Stop { Id = Guid.NewGuid(), City = "A", Name = "X" };
        db.Stops.Add(stop);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = opId,
            RouteCode = "DUP",
            Stops =
            {
                new() { StopId = stop.Id, Order = 1 },
                new() { StopId = stop.Id, Order = 2 }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    [Fact]
    public async Task CreateAsync_MissingStop_Throws()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = Guid.NewGuid(),
            RouteCode = "R1",
            Stops =
            {
                new() { StopId = Guid.NewGuid(), Order = 1 },
                new() { StopId = Guid.NewGuid(), Order = 2 }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateAsync(dto));
    }

    

    // ------------------------------------------------------------
    // GET ALL
    // ------------------------------------------------------------

    [Fact]
    public async Task GetAllAsync_ReturnsRoutes()
    {
        var db = NewDb();

        db.BusRoutes.Add(new BusRoute { Id = Guid.NewGuid(), RouteCode = "A" });
        db.BusRoutes.Add(new BusRoute { Id = Guid.NewGuid(), RouteCode = "B" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetAllAsync();

        Assert.Equal(2, result.Count());
    }

    // ------------------------------------------------------------
    // GET BY ID
    // ------------------------------------------------------------

    [Fact]
    public async Task GetByIdAsync_Success()
    {
        var db = NewDb();
        var id = Guid.NewGuid();

        db.BusRoutes.Add(new BusRoute { Id = id, RouteCode = "R" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var found = await sut.GetByIdAsync(id);

        Assert.NotNull(found);
        Assert.Equal("R", found.RouteCode);
    }

    [Fact]
    public async Task GetByIdAsync_NotFound()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var found = await sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(found);
    }

    // ------------------------------------------------------------
    // UPDATE (ID-BASED)
    // ------------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_Success()
    {
        var db = NewDb();
        var s1 = new Stop { Id = Guid.NewGuid(), City = "C1", Name = "N1" };
        var s2 = new Stop { Id = Guid.NewGuid(), City = "C2", Name = "N2" };

        db.Stops.AddRange(s1, s2);

        var route = new BusRoute { Id = Guid.NewGuid(), OperatorId = Guid.NewGuid(), RouteCode = "OLD" };
        db.BusRoutes.Add(route);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateRouteRequestDto
        {
            RouteCode = "NEW",
            Stops =
            {
                new() { StopId = s1.Id, Order = 1 },
                new() { StopId = s2.Id, Order = 2 }
            }
        };

        var res = await sut.UpdateAsync(route.Id, dto);

        Assert.NotNull(res);
        Assert.Equal("NEW", res.RouteCode);
        Assert.Equal(2, res.Stops.Count);
    }

    [Fact]
    public async Task UpdateAsync_DuplicateRouteCode_Throws()
    {
        var db = NewDb();
        var opId = Guid.NewGuid();

        db.BusRoutes.Add(new BusRoute { Id = Guid.NewGuid(), OperatorId = opId, RouteCode = "EX" });

        var route = new BusRoute { Id = Guid.NewGuid(), OperatorId = opId, RouteCode = "OLD" };
        db.BusRoutes.Add(route);

        var stop = new Stop { Id = Guid.NewGuid(), City = "A", Name = "X" };
        db.Stops.Add(stop);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateRouteRequestDto
        {
            RouteCode = "EX",
            Stops =
            {
                new() { StopId = stop.Id, Order = 1 },
                new() { StopId = stop.Id, Order = 2 }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.UpdateAsync(route.Id, dto));
    }

    // ------------------------------------------------------------
    // DELETE (ID-BASED)
    // ------------------------------------------------------------

    


    [Fact]
    public async Task DeleteAsync_NotFound_ReturnsFalse()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var ok = await sut.DeleteAsync(Guid.NewGuid());

        Assert.False(ok);
    }

    // ------------------------------------------------------------
    // CREATE BY KEYS
    // ------------------------------------------------------------

    [Fact]
    public async Task CreateByKeysAsync_Success()
    {
        var db = NewDb();

        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = user.Id, CompanyName = "Co" };

        db.Users.Add(user);
        db.BusOperators.Add(op);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = "op",
            RouteCode = "R101",
            Stops =
            {
                new() { City="A", Name="X" },
                new() { City="B", Name="Y" }
            }
        };

        var result = await sut.CreateByKeysAsync(dto);

        Assert.Equal("R101", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
    }

    [Fact]
    public async Task CreateByKeysAsync_DuplicateRouteCode_Throws()
    {
        var db = NewDb();

        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = user.Id };

        db.Users.Add(user);
        db.BusOperators.Add(op);

        db.BusRoutes.Add(new BusRoute { Id = Guid.NewGuid(), OperatorId = op.Id, RouteCode = "R1" });

        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = "op",
            RouteCode = "R1",
            Stops =
            {
                new() { City="A", Name="X" },
                new() { City="B", Name="Y" }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateByKeysAsync(dto));
    }

    // ------------------------------------------------------------
    // GET BY CODE
    // ------------------------------------------------------------

    [Fact]
    public async Task GetByCodeAsync_Success()
    {
        var db = NewDb();

        var user = new User { Id = Guid.NewGuid(), Username = "OP" };
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = user.Id, CompanyName = "OP" };

        var route = new BusRoute { Id = Guid.NewGuid(), OperatorId = op.Id, RouteCode = "R5" };

        db.Users.Add(user);
        db.BusOperators.Add(op);
        db.BusRoutes.Add(route);

        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetByCodeAsync("OP", "R5");

        Assert.NotNull(result);
        Assert.Equal("R5", result.RouteCode);
    }


    // ------------------------------------------------------------
    // DELETE BY KEYS
    // ------------------------------------------------------------
