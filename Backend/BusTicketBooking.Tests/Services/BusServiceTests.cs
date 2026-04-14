using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class BusServiceTests
    {
        private BusService CreateService(out AppDbContext db)
        {
            db = DbHelper.CreateDb();
            return new BusService(new Repository<Bus>(db));
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_ValidDto_ReturnsMappedDto()
        {
            var svc = CreateService(out _);
            var dto = new CreateBusRequestDto
            {
                Code = "BUS001",
                RegistrationNumber = "MH01AB1234",
                BusType = BusType.AC,
                TotalSeats = 40,
                Status = BusStatus.Available,
                Amenities = new List<string> { "AC", "WiFi" }
            };

            var result = await svc.CreateAsync(dto);

            Assert.Equal("BUS001", result.Code);
            Assert.Equal("MH01AB1234", result.RegistrationNumber);
            Assert.Equal(BusType.AC, result.BusType);
            Assert.Equal(40, result.TotalSeats);
            Assert.Contains("AC", result.Amenities);
            Assert.Contains("WiFi", result.Amenities);
        }

        [Fact]
        public async Task CreateAsync_DuplicateCode_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            db.Buses.Add(new Bus { Code = "BUS001", RegistrationNumber = "X", BusType = BusType.Seater });
            await db.SaveChangesAsync();

            var dto = new CreateBusRequestDto { Code = "BUS001", RegistrationNumber = "Y", BusType = BusType.Seater };

            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
        }

        [Fact]
        public async Task CreateAsync_NoAmenities_ReturnsEmptyList()
        {
            var svc = CreateService(out _);
            var dto = new CreateBusRequestDto
            {
                Code = "BUS002",
                RegistrationNumber = "MH02CD5678",
                BusType = BusType.Seater,
                Amenities = new List<string>()
            };

            var result = await svc.CreateAsync(dto);

            Assert.Empty(result.Amenities);
        }

        // ── GetAllAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_ReturnsMappedBuses()
        {
            var svc = CreateService(out var db);
            db.Buses.AddRange(
                new Bus { Code = "A", RegistrationNumber = "R1", BusType = BusType.Seater, Amenities = "AC,WiFi" },
                new Bus { Code = "B", RegistrationNumber = "R2", BusType = BusType.Sleeper }
            );
            await db.SaveChangesAsync();

            var result = (await svc.GetAllAsync()).ToList();

            Assert.Equal(2, result.Count);
        }

        [Fact]
        public async Task GetAllAsync_SplitsAmenitiesCorrectly()
        {
            var svc = CreateService(out var db);
            db.Buses.Add(new Bus { Code = "A", RegistrationNumber = "R1", BusType = BusType.AC, Amenities = "AC,WiFi,ChargingPort" });
            await db.SaveChangesAsync();

            var result = (await svc.GetAllAsync()).First();

            Assert.Equal(3, result.Amenities.Count);
        }

        // ── UpdateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateAsync_ExistingBus_UpdatesFields()
        {
            var svc = CreateService(out var db);
            var bus = new Bus { Code = "BUS001", RegistrationNumber = "OLD", BusType = BusType.Seater, TotalSeats = 30 };
            db.Buses.Add(bus);
            await db.SaveChangesAsync();

            var dto = new UpdateBusRequestDto
            {
                RegistrationNumber = "NEW",
                BusType = BusType.AC,
                TotalSeats = 45,
                Status = BusStatus.Available,
                Amenities = new List<string> { "AC" }
            };

            var result = await svc.UpdateAsync(bus.Id, dto);

            Assert.NotNull(result);
            Assert.Equal("NEW", result!.RegistrationNumber);
            Assert.Equal(BusType.AC, result.BusType);
            Assert.Equal(45, result.TotalSeats);
        }

        [Fact]
        public async Task UpdateAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateBusRequestDto { RegistrationNumber = "X", BusType = BusType.Seater });
            Assert.Null(result);
        }

        // ── UpdateStatusAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task UpdateStatusAsync_ExistingBus_ChangesStatus()
        {
            var svc = CreateService(out var db);
            var bus = new Bus { Code = "BUS001", RegistrationNumber = "R", BusType = BusType.Seater, Status = BusStatus.Available };
            db.Buses.Add(bus);
            await db.SaveChangesAsync();

            var result = await svc.UpdateStatusAsync(bus.Id, BusStatus.UnderRepair);

            Assert.NotNull(result);
            Assert.Equal(BusStatus.UnderRepair, result!.Status);
        }

        [Fact]
        public async Task UpdateStatusAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.UpdateStatusAsync(Guid.NewGuid(), BusStatus.Available);
            Assert.Null(result);
        }

        // ── DeleteAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task DeleteAsync_ExistingBus_ReturnsTrue()
        {
            var svc = CreateService(out var db);
            var bus = new Bus { Code = "BUS001", RegistrationNumber = "R", BusType = BusType.Seater };
            db.Buses.Add(bus);
            await db.SaveChangesAsync();

            var result = await svc.DeleteAsync(bus.Id);

            Assert.True(result);
            Assert.Empty(db.Buses.ToList());
        }

        [Fact]
        public async Task DeleteAsync_NotFound_ReturnsFalse()
        {
            var svc = CreateService(out _);
            var result = await svc.DeleteAsync(Guid.NewGuid());
            Assert.False(result);
        }
    }
}
