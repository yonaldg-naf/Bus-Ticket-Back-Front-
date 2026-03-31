using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Tests.Services;

public class RouteServiceTests
{
    private static RouteService Build(BusTicketBooking.Contexts.AppDbContext db) =>
        new(new Repository<BusRoute>(db),
            new Repository<RouteStop>(db),
            new Repository<Stop>(db),
            new Repository<BusOperator>(db),
            new Repository<User>(db),
            db);

    // Seeds two stops and returns their IDs for use in route creation
    private static (Guid stop1Id, Guid stop2Id) SeedStops(BusTicketBooking.Contexts.AppDbContext db)
    {
        var s1 = new Stop { City = "Chennai",   Name = "Central" };
        var s2 = new Stop { City = "Bangalore", Name = "Majestic" };
        db.Stops.AddRange(s1, s2);
        db.SaveChanges();
        return (s1.Id, s2.Id);
    }

    // Seeds operator + user for by-keys tests
    private static (User user, BusOperator op) SeedOperator(BusTicketBooking.Contexts.AppDbContext db)
    {
        var user = SeedHelper.MakeUser(BusTicketBooking.Models.Roles.Operator);
        db.Users.Add(user);
        var op = SeedHelper.MakeOperator(user.Id);
        db.BusOperators.Add(op);
        db.SaveChanges();
        return (user, op);
    }

    // ── CreateAsync (Id-based) ────────────────────────────────────────────────

    [Fact]
    public async Task Create_SavesRoute_WithStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, s2) = SeedStops(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = op.Id,
            RouteCode  = "CHN-BLR",
            Stops = new List<RouteStopItemDto>
            {
                new() { StopId = s1, Order = 1 },
                new() { StopId = s2, Order = 2 }
            }
        };

        var result = await svc.CreateAsync(dto);

        Assert.Equal("CHN-BLR", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
        Assert.Equal(1, result.Stops[0].Order);
        Assert.Equal(2, result.Stops[1].Order);
    }

    [Fact]
    public async Task Create_Throws_WhenDuplicateRouteCode()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, s2) = SeedStops(db);

        // Create first route
        var dto = new CreateRouteRequestDto
        {
            OperatorId = op.Id, RouteCode = "DUP-RT",
            Stops = new List<RouteStopItemDto>
            {
                new() { StopId = s1, Order = 1 },
                new() { StopId = s2, Order = 2 }
            }
        };
        await svc.CreateAsync(dto);

        // Try to create same route code again
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    [Fact]
    public async Task Create_Throws_WhenFewerThanTwoStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, _) = SeedStops(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = op.Id, RouteCode = "ONE-STOP",
            Stops = new List<RouteStopItemDto> { new() { StopId = s1, Order = 1 } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllRoutes()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, s2) = SeedStops(db);

        var dto = new CreateRouteRequestDto
        {
            OperatorId = op.Id, RouteCode = "RT-1",
            Stops = new List<RouteStopItemDto>
            {
                new() { StopId = s1, Order = 1 },
                new() { StopId = s2, Order = 2 }
            }
        };
        await svc.CreateAsync(dto);

        var result = (await svc.GetAllAsync()).ToList();
        Assert.Single(result);
        Assert.Equal("RT-1", result[0].RouteCode);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsRoute_WhenExists()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, s2) = SeedStops(db);

        var created = await svc.CreateAsync(new CreateRouteRequestDto
        {
            OperatorId = op.Id, RouteCode = "RT-2",
            Stops = new List<RouteStopItemDto>
            {
                new() { StopId = s1, Order = 1 },
                new() { StopId = s2, Order = 2 }
            }
        });

        var result = await svc.GetByIdAsync(created.Id);
        Assert.NotNull(result);
        Assert.Equal("RT-2", result!.RouteCode);
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.GetByIdAsync(Guid.NewGuid());
        Assert.Null(result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_RemovesRoute_AndRouteStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var (s1, s2) = SeedStops(db);

        // Create via direct DB insert (no nav-prop loading) to avoid tracking conflicts on delete
        var route = new BusRoute { OperatorId = op.Id, RouteCode = "DEL-RT" };
        db.BusRoutes.Add(route);
        db.SaveChanges();
        db.RouteStops.AddRange(
            new RouteStop { RouteId = route.Id, StopId = s1, Order = 1 },
            new RouteStop { RouteId = route.Id, StopId = s2, Order = 2 }
        );
        db.SaveChanges();
        db.ChangeTracker.Clear();

        var result = await svc.DeleteAsync(route.Id);

        Assert.True(result);
        Assert.Equal(0, db.BusRoutes.AsNoTracking().Count());
        Assert.Equal(0, db.RouteStops.AsNoTracking().Count());
    }

    [Fact]
    public async Task Delete_ReturnsFalse_WhenRouteNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.DeleteAsync(Guid.NewGuid());
        Assert.False(result);
    }

    // ── CreateByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task CreateByKeys_CreatesRoute_AndAutoCreatesStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username,
            RouteCode        = "KEY-RT",
            Stops = new List<StopRefDto>
            {
                new() { City = "Mumbai",  Name = "Dadar" },
                new() { City = "Pune",    Name = "Shivajinagar" }
            }
        };

        var result = await svc.CreateByKeysAsync(dto);

        Assert.Equal("KEY-RT", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
        Assert.Equal("Mumbai",  result.Stops[0].City);
        Assert.Equal("Pune",    result.Stops[1].City);

        // Stops should have been auto-created in the Stops table
        Assert.Equal(2, db.Stops.Count());
    }

    [Fact]
    public async Task CreateByKeys_Throws_WhenFewerThanTwoStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username,
            RouteCode        = "ONE",
            Stops = new List<StopRefDto> { new() { City = "X", Name = "Y" } }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateByKeysAsync(dto));
    }

    [Fact]
    public async Task CreateByKeys_Throws_WhenOperatorNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = "nobody",
            RouteCode        = "RT-X",
            Stops = new List<StopRefDto>
            {
                new() { City = "A", Name = "B" },
                new() { City = "C", Name = "D" }
            }
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateByKeysAsync(dto));
    }

    // ── DeleteByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteByKeys_RemovesRoute()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, op) = SeedOperator(db);

        // Insert directly to avoid nav-prop tracking conflicts on delete
        var route = new BusRoute { OperatorId = op.Id, RouteCode = "DEL-KEY" };
        db.BusRoutes.Add(route);
        db.SaveChanges();
        var s1 = new Stop { City = "A", Name = "Stop1" };
        var s2 = new Stop { City = "B", Name = "Stop2" };
        db.Stops.AddRange(s1, s2);
        db.SaveChanges();
        db.RouteStops.AddRange(
            new RouteStop { RouteId = route.Id, StopId = s1.Id, Order = 1 },
            new RouteStop { RouteId = route.Id, StopId = s2.Id, Order = 2 }
        );
        db.SaveChanges();
        db.ChangeTracker.Clear();

        var result = await svc.DeleteByKeysAsync(user.Username, "DEL-KEY");

        Assert.True(result);
        Assert.Equal(0, db.BusRoutes.AsNoTracking().Count());
    }

    [Fact]
    public async Task DeleteByKeys_ReturnsFalse_WhenRouteNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var result = await svc.DeleteByKeysAsync(user.Username, "NONEXISTENT");
        Assert.False(result);
    }
}
