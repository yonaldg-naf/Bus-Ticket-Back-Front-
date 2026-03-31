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
        new(new Repository<Bus>(db),
            new Repository<BusOperator>(db),
            new Repository<User>(db));

    // Seeds operator + user so BusService can resolve ownership
    private static (User user, BusOperator op) SeedOperator(BusTicketBooking.Contexts.AppDbContext db)
    {
        var user = SeedHelper.MakeUser(Roles.Operator);
        db.Users.Add(user);
        var op = SeedHelper.MakeOperator(user.Id);
        db.BusOperators.Add(op);
        db.SaveChanges();
        return (user, op);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_SavesBus_AndReturnsDto()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);

        var dto = new CreateBusRequestDto
        {
            OperatorId         = op.Id,
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
        var (_, op) = SeedOperator(db);

        // Save a bus first
        var bus = SeedHelper.MakeBus(op.Id);
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var dto = new CreateBusRequestDto
        {
            OperatorId = op.Id, Code = bus.Code,
            RegistrationNumber = "XX", BusType = BusType.Seater,
            TotalSeats = 10, Amenities = new()
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    [Fact]
    public async Task Create_Throws_WhenOperatorIdEmpty()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var dto = new CreateBusRequestDto
        {
            OperatorId = Guid.Empty, Code = "X",
            RegistrationNumber = "Y", BusType = BusType.Seater,
            TotalSeats = 10, Amenities = new()
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(dto));
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllBuses()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);

        db.Buses.AddRange(SeedHelper.MakeBus(op.Id), SeedHelper.MakeBus(op.Id));
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

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsBus_WhenExists()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var bus = SeedHelper.MakeBus(op.Id);
        db.Buses.Add(bus);
        await db.SaveChangesAsync();

        var result = await svc.GetByIdAsync(bus.Id);
        Assert.NotNull(result);
        Assert.Equal(bus.Id, result!.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var result = await svc.GetByIdAsync(Guid.NewGuid());
        Assert.Null(result);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_ChangesFields_AndReturnsDto()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);
        var bus = SeedHelper.MakeBus(op.Id);
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
        var (_, op) = SeedOperator(db);
        var bus = SeedHelper.MakeBus(op.Id, BusStatus.Available);
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
        var (_, op) = SeedOperator(db);
        var bus = SeedHelper.MakeBus(op.Id);
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

    // ── GetAllSecuredAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllSecured_Admin_ReturnsAllBuses()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op1) = SeedOperator(db);
        var (_, op2) = SeedOperator(db);

        db.Buses.AddRange(SeedHelper.MakeBus(op1.Id), SeedHelper.MakeBus(op2.Id));
        await db.SaveChangesAsync();

        var adminId = Guid.NewGuid();
        var result  = (await svc.GetAllSecuredAsync(adminId, Roles.Admin, default)).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllSecured_Operator_ReturnsOnlyOwnBuses()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (user1, op1) = SeedOperator(db);
        var (_, op2)     = SeedOperator(db);

        db.Buses.AddRange(SeedHelper.MakeBus(op1.Id), SeedHelper.MakeBus(op2.Id));
        await db.SaveChangesAsync();

        var result = (await svc.GetAllSecuredAsync(user1.Id, Roles.Operator, default)).ToList();

        Assert.Single(result);
        Assert.Equal(op1.Id, result[0].OperatorId);
    }

    // ── Amenities serialization ───────────────────────────────────────────────

    [Fact]
    public async Task Amenities_StoredAsCommaSeparated_ReturnedAsList()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);

        var dto = new CreateBusRequestDto
        {
            OperatorId = op.Id, Code = "AMN-01",
            RegistrationNumber = "R1", BusType = BusType.AC,
            TotalSeats = 40, Status = BusStatus.Available,
            Amenities = new List<string> { "AC", "WiFi", "ChargingPort" }
        };

        var result = await svc.CreateAsync(dto);

        // Verify stored as comma-separated in DB
        var stored = db.Buses.First(b => b.Code == "AMN-01");
        Assert.Equal("AC,WiFi,ChargingPort", stored.Amenities);

        // Verify returned as list in DTO
        Assert.Equal(3, result.Amenities.Count);
        Assert.Contains("WiFi", result.Amenities);
    }

    [Fact]
    public async Task Amenities_EmptyList_StoredAsNull()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, op) = SeedOperator(db);

        var dto = new CreateBusRequestDto
        {
            OperatorId = op.Id, Code = "NO-AMN",
            RegistrationNumber = "R2", BusType = BusType.Seater,
            TotalSeats = 40, Status = BusStatus.Available,
            Amenities = new List<string>()
        };

        await svc.CreateAsync(dto);

        var stored = db.Buses.First(b => b.Code == "NO-AMN");
        Assert.Null(stored.Amenities);
    }
}
