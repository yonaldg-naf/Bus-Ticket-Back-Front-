using Xunit;
using Moq;
using BusTicketBooking.Services;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Tests.Services
{
    public class BusServiceTests
    {
        private readonly Mock<IRepository<Bus>> _busRepo;
        private readonly Mock<IRepository<BusOperator>> _operatorRepo;
        private readonly Mock<IRepository<User>> _userRepo;

        private readonly BusService _service;

        public BusServiceTests()
        {
            _busRepo = new Mock<IRepository<Bus>>();
            _operatorRepo = new Mock<IRepository<BusOperator>>();
            _userRepo = new Mock<IRepository<User>>();

            _service = new BusService(_busRepo.Object, _operatorRepo.Object, _userRepo.Object);
        }

        [Fact]
        public async Task GetAllSecured_AdminRole_ShouldReturnAllBuses()
        {
            // Arrange
            var buses = new List<Bus>()
            {
                new Bus { Id = Guid.NewGuid(), Code = "A1" },
                new Bus { Id = Guid.NewGuid(), Code = "B2" }
            };

            _busRepo.Setup(r => r.GetAllAsync(default)).ReturnsAsync(buses);

            // Act
            var result = await _service.GetAllSecuredAsync(Guid.NewGuid(), Roles.Admin, default);

            // Assert
            Assert.Equal(2, result.Count());
        }
    }
}