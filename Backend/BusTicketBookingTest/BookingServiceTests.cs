using Xunit;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Contexts;
using Microsoft.EntityFrameworkCore;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Tests.Services
{
    public class BookingServiceTests
    {
        private readonly AppDbContext _db;
        private readonly BookingService _service;

        public BookingServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _db = new AppDbContext(options);

            var bookingRepo = new Repository<Booking>(_db);
            var passengerRepo = new Repository<BookingPassenger>(_db);
            var paymentRepo = new Repository<Payment>(_db);
            var scheduleRepo = new Repository<BusSchedule>(_db);

            _service = new BookingService(bookingRepo, passengerRepo, paymentRepo, scheduleRepo, _db);
        }

        [Fact]
        public async Task CreateBooking_ShouldCreateBooking()
        {
            // Arrange
            var bus = new Bus { Id = Guid.NewGuid(), Code = "A1", Status = BusStatus.Available, TotalSeats = 40 };
            var route = new BusRoute { Id = Guid.NewGuid(), RouteCode = "R1" };
            var schedule = new BusSchedule
            {
                Id = Guid.NewGuid(),
                Bus = bus,
                Route = route,
                BusId = bus.Id,
                RouteId = route.Id,
                BasePrice = 100,
                DepartureUtc = DateTime.UtcNow.AddHours(1)
            };

            _db.Buses.Add(bus);
            _db.BusRoutes.Add(route);
            _db.BusSchedules.Add(schedule);
            await _db.SaveChangesAsync();

            var dto = new CreateBookingRequestDto
            {
                ScheduleId = schedule.Id,
                Passengers = new List<BookingPassengerDto>
                {
                    new BookingPassengerDto { Name = "John", Age = 30, SeatNo = "1" }
                }
            };

            // Act
            var result = await _service.CreateAsync(Guid.NewGuid(), dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(100, result.TotalAmount);
            Assert.Single(result.Passengers);
        }
    }
}