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

    private static (User user, BusOperator op) SeedOperator(BusTicketBooking.Contexts.AppDbContext db)
    {
        var user = SeedHelper.MakeUser(Roles.Operator);
        db.Users.Add(user);
        var op = SeedHelper.MakeOperator(user.Id);
        db.BusOperators.Add(op);
        db.SaveChanges();
        return (user, op);
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllRoutes()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        await svc.CreateByKeysAsync(new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username, RouteCode = "RT-1",
            Stops = new List<StopRefDto> { new() { City = "A", Name = "S1" }, new() { City = "B", Name = "S2" } }
        });

        var result = (await svc.GetAllAsync()).ToList();
        Assert.Single(result);
        Assert.Equal("RT-1", result[0].RouteCode);
    }

    // ── CreateByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task CreateByKeys_CreatesRoute_AndAutoCreatesStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var result = await svc.CreateByKeysAsync(new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username,
            RouteCode        = "KEY-RT",
            Stops = new List<StopRefDto>
            {
                new() { City = "Mumbai", Name = "Dadar" },
                new() { City = "Pune",   Name = "Shivajinagar" }
            }
        });

        Assert.Equal("KEY-RT", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
        Assert.Equal("Mumbai", result.Stops[0].City);
        Assert.Equal("Pune",   result.Stops[1].City);
        Assert.Equal(2, db.Stops.Count());
    }

    [Fact]
    public async Task CreateByKeys_Throws_WhenDuplicateRouteCode()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var dto = new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username, RouteCode = "DUP-RT",
            Stops = new List<StopRefDto> { new() { City = "A", Name = "S1" }, new() { City = "B", Name = "S2" } }
        };
        await svc.CreateByKeysAsync(dto);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateByKeysAsync(dto));
    }

    [Fact]
    public async Task CreateByKeys_Throws_WhenFewerThanTwoStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateByKeysAsync(
            new CreateRouteByKeysRequestDto
            {
                OperatorUsername = user.Username, RouteCode = "ONE",
                Stops = new List<StopRefDto> { new() { City = "X", Name = "Y" } }
            }));
    }

    [Fact]
    public async Task CreateByKeys_Throws_WhenOperatorNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateByKeysAsync(
            new CreateRouteByKeysRequestDto
            {
                OperatorUsername = "nobody", RouteCode = "RT-X",
                Stops = new List<StopRefDto> { new() { City = "A", Name = "B" }, new() { City = "C", Name = "D" } }
            }));
    }

    // ── DeleteByKeysAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteByKeys_RemovesRoute()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, op) = SeedOperator(db);

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

    // ── GetByCodeAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByCode_ReturnsRoute_WhenExists()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        await svc.CreateByKeysAsync(new CreateRouteByKeysRequestDto
        {
            OperatorUsername = user.Username, RouteCode = "RT-CODE",
            Stops = new List<StopRefDto> { new() { City = "X", Name = "S1" }, new() { City = "Y", Name = "S2" } }
        });

        var result = await svc.GetByCodeAsync(user.Username, "RT-CODE");
        Assert.NotNull(result);
        Assert.Equal("RT-CODE", result!.RouteCode);
    }

    [Fact]
    public async Task GetByCode_ReturnsNull_WhenNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user, _) = SeedOperator(db);

        var result = await svc.GetByCodeAsync(user.Username, "NOPE");
        Assert.Null(result);
    }
}
