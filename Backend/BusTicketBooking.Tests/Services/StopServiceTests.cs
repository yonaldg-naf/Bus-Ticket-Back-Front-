using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class StopServiceTests
    {
        private StopService CreateService(out AppDbContext db, string? dbName = null)
        {
            db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            return new StopService(db, new Repository<Stop>(db));
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidDto_ReturnsDto()
        {
            var svc = CreateService(out _);
            var dto = new CreateStopRequestDto { City = "Mumbai", Name = "Borivali East", Latitude = 19.2, Longitude = 72.8 };

            var result = await svc.CreateAsync(dto);

            Assert.Equal("Mumbai", result.City);
            Assert.Equal("Borivali East", result.Name);
            Assert.Equal(19.2, result.Latitude);
        }

        [Fact]
        public async Task CreateAsync_TrimsWhitespace()
        {
            var svc = CreateService(out _);
            var dto = new CreateStopRequestDto { City = "  Mumbai  ", Name = "  Borivali  " };

            var result = await svc.CreateAsync(dto);

            Assert.Equal("Mumbai", result.City);
            Assert.Equal("Borivali", result.Name);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_ExistingStop_UpdatesFields()
        {
            var svc = CreateService(out var db);
            var stop = new Stop { City = "Mumbai", Name = "Old Name" };
            db.Stops.Add(stop);
            await db.SaveChangesAsync();

            var dto = new UpdateStopRequestDto { City = "Pune", Name = "New Name", Latitude = 18.5, Longitude = 73.8 };
            var result = await svc.UpdateAsync(stop.Id, dto);

            Assert.NotNull(result);
            Assert.Equal("Pune", result!.City);
            Assert.Equal("New Name", result.Name);
        }

        [Fact]
        public async Task UpdateAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateStopRequestDto { City = "X", Name = "Y" });
            Assert.Null(result);
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_ExistingStop_ReturnsTrue()
        {
            var svc = CreateService(out var db);
            var stop = new Stop { City = "Mumbai", Name = "Borivali" };
            db.Stops.Add(stop);
            await db.SaveChangesAsync();

            var result = await svc.DeleteAsync(stop.Id);

            Assert.True(result);
            Assert.Empty(db.Stops.ToList());
        }

        [Fact]
        public async Task DeleteAsync_NotFound_ReturnsFalse()
        {
            var svc = CreateService(out _);
            var result = await svc.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }

        // ── RenameCityAsync ───────────────────────────────────────────────────

        [Fact]
        public async Task RenameCityAsync_ExistingCity_RenamesAllStops()
        {
            // Seed with a separate context to avoid tracking conflicts
            var dbName = Guid.NewGuid().ToString();
            using (var seedDb = DbHelper.CreateDb(dbName))
            {
                seedDb.Stops.AddRange(
                    new Stop { City = "Mumbai", Name = "Stop1" },
                    new Stop { City = "Mumbai", Name = "Stop2" },
                    new Stop { City = "Pune", Name = "Stop3" }
                );
                await seedDb.SaveChangesAsync();
            }

            var db = DbHelper.CreateDb(dbName);
            var svc = new StopService(db, new Repository<Stop>(db));

            var count = await svc.RenameCityAsync("Mumbai", "Bombay");

            Assert.Equal(2, count);
            Assert.Equal(2, db.Stops.Count(s => s.City == "Bombay"));
        }

        [Fact]
        public async Task RenameCityAsync_SameName_ReturnsZero()
        {
            var svc = CreateService(out var db);
            db.Stops.Add(new Stop { City = "Mumbai", Name = "Stop1" });
            await db.SaveChangesAsync();

            var count = await svc.RenameCityAsync("Mumbai", "Mumbai");

            Assert.Equal(0, count);
        }

        [Fact]
        public async Task RenameCityAsync_CityNotFound_ReturnsZero()
        {
            var svc = CreateService(out _);
            var count = await svc.RenameCityAsync("NonExistent", "NewName");
            Assert.Equal(0, count);
        }

        [Fact]
        public async Task RenameCityAsync_BlankCurrentCity_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out _);
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RenameCityAsync("", "NewName"));
        }

        [Fact]
        public async Task RenameCityAsync_BlankNewCity_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out _);
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.RenameCityAsync("Mumbai", ""));
        }

        // ── GetCitiesAsync ────────────────────────────────────────────────────

        [Fact]
        public async Task GetCitiesAsync_ReturnsGroupedCities()
        {
            var svc = CreateService(out var db);
            db.Stops.AddRange(
                new Stop { City = "Mumbai", Name = "Stop1" },
                new Stop { City = "Mumbai", Name = "Stop2" },
                new Stop { City = "Pune", Name = "Stop3" }
            );
            await db.SaveChangesAsync();

            var cities = (await svc.GetCitiesAsync()).ToList();

            Assert.Equal(2, cities.Count);
            var mumbai = cities.First(c => c.City == "Mumbai");
            Assert.Equal(2, mumbai.StopCount);
        }

        // ── GetStopsByCityAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetStopsByCityAsync_ReturnsStopsForCity()
        {
            var svc = CreateService(out var db);
            db.Stops.AddRange(
                new Stop { City = "Mumbai", Name = "Borivali" },
                new Stop { City = "Mumbai", Name = "Andheri" },
                new Stop { City = "Pune", Name = "Shivajinagar" }
            );
            await db.SaveChangesAsync();

            var stops = (await svc.GetStopsByCityAsync("Mumbai")).ToList();

            Assert.Equal(2, stops.Count);
            Assert.All(stops, s => Assert.Equal("Mumbai", s.City));
        }

        [Fact]
        public async Task GetStopsByCityAsync_BlankCity_ReturnsEmpty()
        {
            var svc = CreateService(out _);
            var result = await svc.GetStopsByCityAsync("   ");
            Assert.Empty(result);
        }

        [Fact]
        public async Task GetStopsByCityAsync_UnknownCity_ReturnsEmpty()
        {
            var svc = CreateService(out _);
            var result = await svc.GetStopsByCityAsync("Atlantis");
            Assert.Empty(result);
        }
    }
}
