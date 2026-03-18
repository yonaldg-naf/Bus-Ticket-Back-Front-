using BusTicketBooking.Services;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Stops;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BusTicketBooking.Tests.Services
{
    public class StopServiceTests
    {
        private readonly AppDbContext _db;
        private readonly StopService _service;

        public StopServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _db = new AppDbContext(options);
            _service = new StopService(_db);
        }

        [Fact]
        public async Task CreateStop_ShouldReturnCreatedStop()
        {
            // Arrange
            var dto = new CreateStopRequestDto
            {
                City = "Mumbai",
                Name = "Andheri",
                Latitude = 19.1197,
                Longitude = 72.8468
            };

            // Act
            var result = await _service.CreateAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Mumbai", result.City);
            Assert.Equal("Andheri", result.Name);
        }

        [Fact]
        public async Task GetCities_ShouldReturnCities()
        {
            // Arrange
            _db.Stops.Add(new BusTicketBooking.Models.Stop { City = "Mumbai", Name = "A" });
            _db.Stops.Add(new BusTicketBooking.Models.Stop { City = "Pune", Name = "B" });
            await _db.SaveChangesAsync();

            // Act
            var result = await _service.GetCitiesAsync();

            // Assert
            Assert.Contains(result, x => x.City == "Mumbai");
            Assert.Contains(result, x => x.City == "Pune");
        }

        [Fact]
        public async Task GetStopsByCity_ShouldReturnStops()
        {
            // Arrange
            _db.Stops.Add(new BusTicketBooking.Models.Stop { City = "Mumbai", Name = "A" });
            _db.Stops.Add(new BusTicketBooking.Models.Stop { City = "Mumbai", Name = "B" });
            await _db.SaveChangesAsync();

            // Act
            var result = await _service.GetStopsByCityAsync("Mumbai");

            // Assert
            Assert.Equal(2, result.Count());
        }
    }
}