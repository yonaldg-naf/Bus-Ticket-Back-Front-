using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class StopServiceTests
    {
        // ── GetCitiesAsync ────────────────────────────────────────────────────

        [Fact]
        public async Task GetCities_ReturnsDistinctCities_WithStopCount()
        {
            using var db = DbHelper.CreateDb();
            db.Stops.AddRange(
                new Stop { City = "Mumbai", Name = "Dadar",    Latitude = 0, Longitude = 0 },
                new Stop { City = "Mumbai", Name = "Andheri",  Latitude = 0, Longitude = 0 },
                new Stop { City = "Pune",   Name = "Shivajinagar", Latitude = 0, Longitude = 0 }
            );
            await db.SaveChangesAsync();

            var svc    = new StopService(db);
            var cities = (await svc.GetCitiesAsync()).ToList();

            Assert.Equal(2, cities.Count);
            Assert.Equal(2, cities.First(c => c.City == "Mumbai").StopCount);
            Assert.Equal(1, cities.First(c => c.City == "Pune").StopCount);
        }

        [Fact]
        public async Task GetCities_ReturnsEmpty_WhenNoStops()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new StopService(db);
            var cities = await svc.GetCitiesAsync();
            Assert.Empty(cities);
        }

        // ── GetStopsByCityAsync ───────────────────────────────────────────────

        [Fact]
        public async Task GetStopsByCity_ReturnsOnlyMatchingCity()
        {
            using var db = DbHelper.CreateDb();
            db.Stops.AddRange(
                new Stop { City = "Mumbai", Name = "Dadar",   Latitude = 0, Longitude = 0 },
                new Stop { City = "Pune",   Name = "Kothrud", Latitude = 0, Longitude = 0 }
            );
            await db.SaveChangesAsync();

            var svc   = new StopService(db);
            var stops = (await svc.GetStopsByCityAsync("Mumbai")).ToList();

            Assert.Single(stops);
            Assert.Equal("Dadar", stops[0].Name);
        }

        [Fact]
        public async Task GetStopsByCity_ReturnsEmpty_WhenCityNotFound()
        {
            using var db = DbHelper.CreateDb();
            var svc   = new StopService(db);
            var stops = await svc.GetStopsByCityAsync("NonExistentCity");
            Assert.Empty(stops);
        }

        [Fact]
        public async Task GetStopsByCity_ReturnsEmpty_WhenCityIsWhitespace()
        {
            using var db = DbHelper.CreateDb();
            var svc   = new StopService(db);
            var stops = await svc.GetStopsByCityAsync("   ");
            Assert.Empty(stops);
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task Create_SavesStop_AndReturnsDto()
        {
            using var db = DbHelper.CreateDb();
            var svc = new StopService(db);

            var dto = new CreateStopRequestDto
            {
                City      = "  Chennai  ",
                Name      = "  Central  ",
                Latitude  = 13.08,
                Longitude = 80.27
            };

            var result = await svc.CreateAsync(dto);

            Assert.Equal("Chennai", result.City);   // trimmed
            Assert.Equal("Central", result.Name);   // trimmed
            Assert.Equal(13.08, result.Latitude);
            Assert.Single(db.Stops);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task Update_ChangesFields_AndReturnsDto()
        {
            using var db = DbHelper.CreateDb();
            var stop = new Stop { City = "Old City", Name = "Old Name", Latitude = 0, Longitude = 0 };
            db.Stops.Add(stop);
            await db.SaveChangesAsync();

            var svc = new StopService(db);
            var dto = new UpdateStopRequestDto
            {
                City      = "New City",
                Name      = "New Name",
                Latitude  = 12.0,
                Longitude = 77.0
            };

            var result = await svc.UpdateAsync(stop.Id, dto);

            Assert.NotNull(result);
            Assert.Equal("New City", result!.City);
            Assert.Equal("New Name", result.Name);
        }

        [Fact]
        public async Task Update_ReturnsNull_WhenStopNotFound()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new StopService(db);
            var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateStopRequestDto
            {
                City = "X", Name = "Y", Latitude = 0, Longitude = 0
            });
            Assert.Null(result);
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task Delete_RemovesStop_AndReturnsTrue()
        {
            using var db = DbHelper.CreateDb();
            var stop = new Stop { City = "Mumbai", Name = "Dadar", Latitude = 0, Longitude = 0 };
            db.Stops.Add(stop);
            await db.SaveChangesAsync();

            var svc    = new StopService(db);
            var result = await svc.DeleteAsync(stop.Id);

            Assert.True(result);
            Assert.Empty(db.Stops);
        }

        [Fact]
        public async Task Delete_ReturnsFalse_WhenStopNotFound()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new StopService(db);
            var result = await svc.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }
    }
}
