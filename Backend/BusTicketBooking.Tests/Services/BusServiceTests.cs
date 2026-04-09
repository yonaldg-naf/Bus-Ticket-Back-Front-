using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class BusServiceTests
{
    private static BusService Build(BusTicketBooking.Contexts.AppDbContext db) =>
        new(new Repository<Bus>(db));

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_SavesBus_AndReturnsDto()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var dto = new CreateBusRequestDto
        {
            Code               = "BUS-01",
            RegistrationNumber = "MH12AB1234",
            BusType            = BusType.Seater,
            TotalSeats         = 40,
            Status             = BusStatus.Available,
            Amenities          = new List<string> { "AC", "WiFi" }
        };

        var result = await svc.CreateAsync(dto);

        Assert.Equal("BUS-01", result.Code);
        Assert.Equal(40, result.TotalSeats);
        Assert.Contains("AC", result.Amenities);
        Assert.Contains("WiFi", result.Amenities);
        Assert.Single(db.Buses);
    }

    [Fact]
    public async Task Create_Throws_WhenDuplicateCode()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var bus = SeedHelper.MakeBus();
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var dto = new CreateBusRequestDto
        {
            Code = bus.Code, RegistrationNumber = "XX",
            BusType = BusType.Seater, TotalSeats = 10, Amenities = new()
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllBuses()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        db.Buses.AddRange(SeedHelper.MakeBus(), SeedHelper.MakeBus());
        await db.SaveChangesAsync();

        var result = (await svc.GetAllAsync()).ToList();
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAll_ReturnsEmpty_WhenNoBuses()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.GetAllAsync();
        Assert.Empty(result);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_ChangesFields_AndReturnsDto()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var bus = SeedHelper.MakeBus();
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var dto = new UpdateBusRequestDto
        {
            RegistrationNumber = "NEW-REG",
            BusType            = BusType.Sleeper,
            TotalSeats         = 30,
            Status             = BusStatus.UnderRepair,
            Amenities          = new List<string> { "Blanket" }
        };

        var result = await svc.UpdateAsync(bus.Id, dto);

        Assert.NotNull(result);
        Assert.Equal("NEW-REG", result!.RegistrationNumber);
        Assert.Equal(BusType.Sleeper, result.BusType);
        Assert.Equal(30, result.TotalSeats);
        Assert.Equal(BusStatus.UnderRepair, result.Status);
        Assert.Contains("Blanket", result.Amenities);
    }

    [Fact]
    public async Task Update_ReturnsNull_WhenBusNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.UpdateAsync(Guid.NewGuid(), new UpdateBusRequestDto
        {
            RegistrationNumber = "X", BusType = BusType.Seater,
            TotalSeats = 10, Status = BusStatus.Available, Amenities = new()
        });
        Assert.Null(result);
    }

    // ── UpdateStatusAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateStatus_ChangesStatus()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var bus = SeedHelper.MakeBus(BusStatus.Available);
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var result = await svc.UpdateStatusAsync(bus.Id, BusStatus.UnderRepair);

        Assert.NotNull(result);
        Assert.Equal(BusStatus.UnderRepair, result!.Status);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsNull_WhenBusNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.UpdateStatusAsync(Guid.NewGuid(), BusStatus.Available);
        Assert.Null(result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_RemovesBus_AndReturnsTrue()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var bus = SeedHelper.MakeBus();
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var result = await svc.DeleteAsync(bus.Id);

        Assert.True(result);
        Assert.Empty(db.Buses);
    }

    [Fact]
    public async Task Delete_ReturnsFalse_WhenBusNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.DeleteAsync(Guid.NewGuid());
        Assert.False(result);
    }

    // ── Amenities serialization ───────────────────────────────────────────────

    [Fact]
    public async Task Amenities_StoredAsCommaSeparated_ReturnedAsList()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var dto = new CreateBusRequestDto
        {
            Code = "AMN-01", RegistrationNumber = "R1",
            BusType = BusType.AC, TotalSeats = 40, Status = BusStatus.Available,
            Amenities = new List<string> { "AC", "WiFi", "ChargingPort" }
        };

        var result = await svc.CreateAsync(dto);

        var stored = db.Buses.First(b => b.Code == "AMN-01");
        Assert.Equal("AC,WiFi,ChargingPort", stored.Amenities);
        Assert.Equal(3, result.Amenities.Count);
        Assert.Contains("WiFi", result.Amenities);
    }

    [Fact]
    public async Task Amenities_EmptyList_StoredAsNull()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var dto = new CreateBusRequestDto
        {
            Code = "NO-AMN", RegistrationNumber = "R2",
            BusType = BusType.Seater, TotalSeats = 40, Status = BusStatus.Available,
            Amenities = new List<string>()
        };

        await svc.CreateAsync(dto);

        var stored = db.Buses.First(b => b.Code == "NO-AMN");
        Assert.Null(stored.Amenities);
    }
}
