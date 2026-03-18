using Xunit;
using Microsoft.EntityFrameworkCore;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Repositories;
using BusTicketBooking.Interfaces;

namespace BusTicketBooking.Tests.Services
{
    public class RouteServiceTests
    {
        private readonly AppDbContext _db;
        private readonly RouteService _service;

        private readonly IRepository<BusRoute> _routeRepo;
        private readonly IRepository<RouteStop> _routeStopRepo;
        private readonly IRepository<Stop> _stopRepo;
        private readonly IRepository<BusOperator> _operatorRepo;
        private readonly IRepository<User> _userRepo;

        public RouteServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _db = new AppDbContext(options);

            _routeRepo = new Repository<BusRoute>(_db);
            _routeStopRepo = new Repository<RouteStop>(_db);
            _stopRepo = new Repository<Stop>(_db);
            _operatorRepo = new Repository<BusOperator>(_db);
            _userRepo = new Repository<User>(_db);

            _service = new RouteService(
                _routeRepo,
                _routeStopRepo,
                _stopRepo,
                _operatorRepo,
                _userRepo,
                _db
            );
        }

        [Fact]
        public async Task CreateRoute_ShouldCreateSuccessfully()
        {
            // Arrange
            var operatorId = Guid.NewGuid();
            var stop1 = new Stop { Id = Guid.NewGuid(), City = "Mumbai", Name = "Andheri" };
            var stop2 = new Stop { Id = Guid.NewGuid(), City = "Pune", Name = "Wakad" };

            _db.Stops.Add(stop1);
            _db.Stops.Add(stop2);
            await _db.SaveChangesAsync();

            var dto = new CreateRouteRequestDto
            {
                OperatorId = operatorId,
                RouteCode = "R1",
                Stops = new List<RouteStopItemDto>
                {
                    new RouteStopItemDto { StopId = stop1.Id, Order = 1 },
                    new RouteStopItemDto { StopId = stop2.Id, Order = 2 },
                }
            };

            // Act
            var result = await _service.CreateAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("R1", result.RouteCode);
            Assert.Equal(2, result.Stops.Count);
        }

        [Fact]
        public async Task CreateRoute_ShouldThrow_WhenStopsAreNotContinuous()
        {
            // Arrange
            var operatorId = Guid.NewGuid();
            var stop1 = new Stop { Id = Guid.NewGuid(), City = "Mumbai", Name = "A" };
            var stop2 = new Stop { Id = Guid.NewGuid(), City = "Pune", Name = "B" };

            _db.Stops.Add(stop1);
            _db.Stops.Add(stop2);
            await _db.SaveChangesAsync();

            var dto = new CreateRouteRequestDto
            {
                OperatorId = operatorId,
                RouteCode = "R2",
                Stops = new List<RouteStopItemDto>
                {
                    new RouteStopItemDto { StopId = stop1.Id, Order = 1 },
                    new RouteStopItemDto { StopId = stop2.Id, Order = 3 }, // gap here
                }
            };

            // Act + Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreateAsync(dto));
        }

        [Fact]
        public async Task UpdateRoute_ShouldReplaceStops()
        {
            // Arrange
            var operatorId = Guid.NewGuid();

            var stop1 = new Stop { Id = Guid.NewGuid(), City = "CityA", Name = "Stop1" };
            var stop2 = new Stop { Id = Guid.NewGuid(), City = "CityA", Name = "Stop2" };
            var stop3 = new Stop { Id = Guid.NewGuid(), City = "CityA", Name = "Stop3" };

            _db.Stops.AddRange(stop1, stop2, stop3);

            var route = new BusRoute
            {
                Id = Guid.NewGuid(),
                OperatorId = operatorId,
                RouteCode = "R10"
            };

            _db.BusRoutes.Add(route);

            _db.RouteStops.Add(new RouteStop
            {
                Id = Guid.NewGuid(),
                RouteId = route.Id,
                StopId = stop1.Id,
                Order = 1
            });

            await _db.SaveChangesAsync();

            var dto = new UpdateRouteRequestDto
            {
                RouteCode = "R10",
                Stops = new List<RouteStopItemDto>
                {
                    new RouteStopItemDto { StopId = stop2.Id, Order = 1 },
                    new RouteStopItemDto { StopId = stop3.Id, Order = 2 }
                }
            };

            // Act
            var result = await _service.UpdateAsync(route.Id, dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result.Stops.Count);
            Assert.Contains(result.Stops, s => s.StopId == stop2.Id);
            Assert.Contains(result.Stops, s => s.StopId == stop3.Id);
        }

        [Fact]
        public async Task DeleteRoute_ShouldReturnTrue()
        {
            // Arrange
            var route = new BusRoute
            {
                Id = Guid.NewGuid(),
                RouteCode = "R5",
                OperatorId = Guid.NewGuid()
            };

            _db.BusRoutes.Add(route);
            await _db.SaveChangesAsync();

            // Act
            var result = await _service.DeleteAsync(route.Id);

            // Assert
            Assert.True(result);
        }
    }
}