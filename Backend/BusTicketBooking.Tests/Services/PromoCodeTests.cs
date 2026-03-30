using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

/// <summary>
/// Tests that promo code discounts are applied correctly during booking creation.
/// </summary>
public class PromoCodeTests
{
    private static BookingService MakeSvc(AppDbContext db) =>
        new(new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db,
            new WalletService(db));

    // Seeds a minimal operator + bus + schedule so we can create bookings
    private static (AppDbContext db, BookingService svc, Guid scheduleId, Guid operatorId) Setup(decimal basePrice = 1000)
    {
        var db  = DbHelper.CreateDb();
        var svc = MakeSvc(db);

        var op = new BusOperator { CompanyName = "T", SupportPhone = "1" };
        db.BusOperators.Add(op);
        var bus = new Bus { OperatorId = op.Id, Code = "B1", RegistrationNumber = "R1", BusType = BusType.Seater, TotalSeats = 40, Status = BusStatus.Available };
        db.Buses.Add(bus);
        var route = new BusRoute { OperatorId = op.Id, RouteCode = "A-B" };
        db.BusRoutes.Add(route);
        var schedule = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddHours(3), BasePrice = basePrice };
        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        return (db, svc, schedule.Id, op.Id);
    }

    private static CreateBookingRequestDto Dto(Guid scheduleId, string? promoCode = null) =>
        new()
        {
            ScheduleId = scheduleId,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "1" }],
            PromoCode  = promoCode
        };

    // ── Flat discount ─────────────────────────────────────────────────────────

    [Fact]
    public async Task FlatDiscount_AppliedCorrectly()
    {
        var (db, svc, schedId, opId) = Setup(1000);
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "FLAT100", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "FLAT100"));

        Assert.Equal(900m, result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
        Assert.Equal("FLAT100", result.PromoCode);
    }

    // ── Percentage discount ───────────────────────────────────────────────────

    [Fact]
    public async Task PercentageDiscount_AppliedCorrectly()
    {
        var (db, svc, schedId, opId) = Setup(1000);
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "PCT10", DiscountType = 2, DiscountValue = 10, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "PCT10"));

        Assert.Equal(900m, result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
    }

    // ── Max discount cap ──────────────────────────────────────────────────────

    [Fact]
    public async Task MaxDiscountCap_IsRespected()
    {
        var (db, svc, schedId, opId) = Setup(1000);
        // 50% of 1000 = 500, but capped at 200
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "CAPPED", DiscountType = 2, DiscountValue = 50, MaxDiscountAmount = 200, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "CAPPED"));

        Assert.Equal(800m, result.TotalAmount);
        Assert.Equal(200m, result.DiscountAmount);
    }

    // ── UsedCount increments ──────────────────────────────────────────────────

    [Fact]
    public async Task UsedCount_IncrementedAfterBooking()
    {
        var (db, svc, schedId, opId) = Setup(500);
        var promo = new PromoCode { OperatorId = opId, Code = "USE1", DiscountType = 1, DiscountValue = 50, MaxUses = 5, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) };
        db.PromoCodes.Add(promo);
        db.SaveChanges();

        await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "USE1"));

        var updated = db.PromoCodes.Find(promo.Id)!;
        Assert.Equal(1, updated.UsedCount);
    }

    // ── Max uses reached ──────────────────────────────────────────────────────

    [Fact]
    public async Task MaxUsesReached_PromoIgnored()
    {
        var (db, svc, schedId, opId) = Setup(500);
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "MAXED", DiscountType = 1, DiscountValue = 100, MaxUses = 2, UsedCount = 2, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MAXED"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    // ── Expired promo ─────────────────────────────────────────────────────────

    [Fact]
    public async Task ExpiredPromo_Ignored()
    {
        var (db, svc, schedId, opId) = Setup(500);
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "EXP", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(-1) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "EXP"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    // ── Inactive promo ────────────────────────────────────────────────────────

    [Fact]
    public async Task InactivePromo_Ignored()
    {
        var (db, svc, schedId, opId) = Setup(500);
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "OFF", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = false, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "OFF"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    // ── Min booking amount not met ────────────────────────────────────────────

    [Fact]
    public async Task MinBookingAmountNotMet_PromoIgnored()
    {
        var (db, svc, schedId, opId) = Setup(300); // base price 300, min required 500
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "MIN500", DiscountType = 1, DiscountValue = 50, MinBookingAmount = 500, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MIN500"));

        Assert.Equal(300m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    // ── No promo code provided ────────────────────────────────────────────────

    [Fact]
    public async Task NoPromoCode_FullPriceCharged()
    {
        var (_, svc, schedId, _) = Setup(750);

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, null));

        Assert.Equal(750m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
        Assert.Null(result.PromoCode);
    }

    // ── Discount cannot exceed total ──────────────────────────────────────────

    [Fact]
    public async Task FlatDiscount_CannotExceedTotal()
    {
        var (db, svc, schedId, opId) = Setup(100); // price 100, discount 500 → should cap at 100
        db.PromoCodes.Add(new PromoCode { OperatorId = opId, Code = "BIG", DiscountType = 1, DiscountValue = 500, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "BIG"));

        Assert.Equal(0m,   result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
    }
}
