using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class RouteServiceTests
    {
        private (RouteService svc, AppDbContext db) CreateService(string? dbName = null)
        {
            var db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            var svc = new RouteService(
                new Repository<BusRoute>(db),
                new Repository<RouteStop>(db),
                new Repository<Stop>(db),
                db);
            return (svc, db);
        }

        private static CreateRouteByKeysRequestDto MakeCreateDto(string code = "R001", int stopCount = 2)
        {
            var stops = Enumerable.Range(1, stopCount)
                .Select(i => new StopRefDto { City = $"City{i}", Name = $"Stop{i}" })
                .ToList();
            return new CreateRouteByKeysRequestDto { RouteCode = code, Stops = stops };
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidDto_CreatesRouteWithStops()
        {
            var (svc, _) = CreateService();
            var dto = MakeCreateDto("R001", 3);

            var result = await svc.CreateAsync(dto);

            Assert.Equal("R001", result.RouteCode);
            Assert.Equal(3, result.Stops.Count);
        }

        [Fact]
        public async Task CreateAsync_LessThanTwoStops_ThrowsInvalidOperationException()
        {
            var (svc, _) = CreateService();
            var dto = MakeCreateDto("R001", 1);

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_DuplicateRouteCode_ThrowsInvalidOperationException()
        {
            var (svc, db) = CreateService();
            db.BusRoutes.Add(new BusRoute { RouteCode = "R001" });
            await db.SaveChangesAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(MakeCreateDto("R001")));
        }

        [Fact]
        public async Task CreateAsync_StopsOrderedCorrectly()
        {
            var (svc, _) = CreateService();
            var dto = MakeCreateDto("R001", 3);

            var result = await svc.CreateAsync(dto);

            Assert.Equal(1, result.Stops[0].Order);
            Assert.Equal(2, result.Stops[1].Order);
            Assert.Equal(3, result.Stops[2].Order);
        }

        [Fact]
        public async Task CreateAsync_ReusesExistingStop()
        {
            var (svc, db) = CreateService();
            db.Stops.Add(new Stop { City = "City1", Name = "Stop1" });
            await db.SaveChangesAsync();

            var dto = MakeCreateDto("R001", 2);
            await svc.CreateAsync(dto);

            // Should not create a duplicate stop for City1/Stop1
            Assert.Equal(1, db.Stops.Count(s => s.City == "City1" && s.Name == "Stop1"));
        }

        // ── GetAllAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsAllRoutes()
        {
            var (svc, db) = CreateService();
            db.BusRoutes.AddRange(
                new BusRoute { RouteCode = "R001" },
                new BusRoute { RouteCode = "R002" }
            );
            await db.SaveChangesAsync();

            var result = (await svc.GetAllAsync()).ToList();

            Assert.Equal(2, result.Count);
        }

        // ── GetByIdAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task GetByIdAsync_ExistingRoute_ReturnsDto()
        {
            var (svc, db) = CreateService();
            var route = new BusRoute { RouteCode = "R001" };
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var result = await svc.GetByIdAsync(route.Id);

            Assert.NotNull(result);
            Assert.Equal("R001", result!.RouteCode);
        }

        [Fact]
        public async Task GetByIdAsync_NotFound_ReturnsNull()
        {
            var (svc, _) = CreateService();
            var result = await svc.GetByIdAsync(Guid.NewGuid());
            Assert.Null(result);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_NotFound_ReturnsNull()
        {
            var (svc, _) = CreateService();
            var dto = new UpdateRouteByKeysRequestDto
            {
                NewRouteCode = "R999",
                Stops = new List<StopRefDto>
                {
                    new() { City = "C1", Name = "S1" },
                    new() { City = "C2", Name = "S2" }
                }
            };
            var result = await svc.UpdateAsync(Guid.NewGuid(), dto);
            Assert.Null(result);
        }

        [Fact]
        public async Task UpdateAsync_LessThanTwoStops_ThrowsInvalidOperationException()
        {
            var (svc, db) = CreateService();
            var route = new BusRoute { RouteCode = "R001" };
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var dto = new UpdateRouteByKeysRequestDto
            {
                NewRouteCode = "R001",
                Stops = new List<StopRefDto> { new() { City = "C1", Name = "S1" } }
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.UpdateAsync(route.Id, dto));
        }

        [Fact]
        public async Task UpdateAsync_ValidData_UpdatesRouteCode()
        {
            var (svc, db) = CreateService();
            var route = new BusRoute { RouteCode = "R001" };
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var dto = new UpdateRouteByKeysRequestDto
            {
                NewRouteCode = "R002",
                Stops = new List<StopRefDto>
                {
                    new() { City = "C1", Name = "S1" },
                    new() { City = "C2", Name = "S2" }
                }
            };

            var result = await svc.UpdateAsync(route.Id, dto);

            Assert.NotNull(result);
            Assert.Equal("R002", result!.RouteCode);
        }

        [Fact]
        public async Task UpdateAsync_DuplicateRouteCode_ThrowsInvalidOperationException()
        {
            var (svc, db) = CreateService();
            var route1 = new BusRoute { RouteCode = "R001" };
            var route2 = new BusRoute { RouteCode = "R002" };
            db.BusRoutes.AddRange(route1, route2);
            await db.SaveChangesAsync();

            var dto = new UpdateRouteByKeysRequestDto
            {
                NewRouteCode = "R002", // already taken by route2
                Stops = new List<StopRefDto>
                {
                    new() { City = "C1", Name = "S1" },
                    new() { City = "C2", Name = "S2" }
                }
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.UpdateAsync(route1.Id, dto));
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_ExistingRoute_ReturnsTrue()
        {
            var (svc, db) = CreateService();
            var route = new BusRoute { RouteCode = "R001" };
            db.BusRoutes.Add(route);
            await db.SaveChangesAsync();

            var result = await svc.DeleteAsync(route.Id);

            Assert.True(result);
            Assert.Empty(db.BusRoutes.ToList());
        }

        [Fact]
        public async Task DeleteAsync_NotFound_ReturnsFalse()
        {
            var (svc, _) = CreateService();
            var result = await svc.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }

        [Fact]
        public async Task DeleteAsync_DeletesAssociatedRouteStops()
        {
            var dbName = Guid.NewGuid().ToString();
            Guid routeId;

            // Create route in one context
            using (var createDb = DbHelper.CreateDb(dbName))
            {
                var createSvc = new RouteService(
                    new Repository<BusRoute>(createDb),
                    new Repository<RouteStop>(createDb),
                    new Repository<Stop>(createDb),
                    createDb);
                var created = await createSvc.CreateAsync(MakeCreateDto("R001", 2));
                routeId = created.Id;
            }

            // Delete in a fresh context
            var db = DbHelper.CreateDb(dbName);
            var svc = new RouteService(
                new Repository<BusRoute>(db),
                new Repository<RouteStop>(db),
                new Repository<Stop>(db),
                db);

            await svc.DeleteAsync(routeId);

            Assert.Empty(db.BusRoutes.ToList());
            Assert.Empty(db.RouteStops.ToList());
        }
    }
}
