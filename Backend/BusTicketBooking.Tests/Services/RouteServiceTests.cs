using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class RouteServiceTests
{
    private static RouteService Build(BusTicketBooking.Contexts.AppDbContext db) =>
        new(new Repository<BusRoute>(db),
            new Repository<RouteStop>(db),
            new Repository<Stop>(db),
            db);

    private static CreateRouteByKeysRequestDto MakeDto(string code = "RT-1") =>
        new()
        {
            RouteCode = code,
            Stops = new List<StopRefDto>
            {
                new() { City = "Mumbai", Name = "Dadar" },
                new() { City = "Pune",   Name = "Shivajinagar" }
            }
        };

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllRoutes()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.CreateAsync(MakeDto("RT-1"));

        var result = (await svc.GetAllAsync()).ToList();
        Assert.Single(result);
        Assert.Equal("RT-1", result[0].RouteCode);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_CreatesRoute_AndAutoCreatesStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.CreateAsync(MakeDto("KEY-RT"));

        Assert.Equal("KEY-RT", result.RouteCode);
        Assert.Equal(2, result.Stops.Count);
        Assert.Equal("Mumbai", result.Stops[0].City);
        Assert.Equal("Pune",   result.Stops[1].City);
        Assert.Equal(2, db.Stops.Count());
    }

    [Fact]
    public async Task Create_Throws_WhenDuplicateRouteCode()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.CreateAsync(MakeDto("DUP-RT"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(MakeDto("DUP-RT")));
    }

    [Fact]
    public async Task Create_Throws_WhenFewerThanTwoStops()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(new CreateRouteByKeysRequestDto
        {
            RouteCode = "ONE",
            Stops = new List<StopRefDto> { new() { City = "X", Name = "Y" } }
        }));
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_ChangesRouteCode()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var created = await svc.CreateAsync(MakeDto("OLD-RT"));

        var updated = await svc.UpdateAsync(created.Id, new UpdateRouteByKeysRequestDto
        {
            NewRouteCode = "NEW-RT",
            Stops = new List<StopRefDto>
            {
                new() { City = "Delhi",   Name = "ISBT" },
                new() { City = "Jaipur",  Name = "Sindhi Camp" }
            }
        });

        Assert.NotNull(updated);
        Assert.Equal("NEW-RT", updated!.RouteCode);
    }

    [Fact]
    public async Task Update_ReturnsNull_WhenRouteNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateRouteByKeysRequestDto
        {
            NewRouteCode = "X",
            Stops = new List<StopRefDto> { new() { City = "A", Name = "B" }, new() { City = "C", Name = "D" } }
        });

        Assert.Null(result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_RemovesRoute()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var created = await svc.CreateAsync(MakeDto("DEL-RT"));

        var result = await svc.DeleteAsync(created.Id);

        Assert.True(result);
        Assert.Equal(0, db.BusRoutes.Count());
    }

    [Fact]
    public async Task Delete_ReturnsFalse_WhenRouteNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.DeleteAsync(Guid.NewGuid());
        Assert.False(result);
    }

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsRoute_WhenExists()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var created = await svc.CreateAsync(MakeDto("RT-CODE"));

        var result = await svc.GetByIdAsync(created.Id);
        Assert.NotNull(result);
        Assert.Equal("RT-CODE", result!.RouteCode);
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.GetByIdAsync(Guid.NewGuid());
        Assert.Null(result);
    }
}
