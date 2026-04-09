using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class PromoCodeTests
{
    private static BookingService MakeSvc(AppDbContext db) =>
        new(new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db,
            new WalletService(
                new Repository<BusTicketBooking.Models.Wallet>(db),
                new Repository<BusTicketBooking.Models.WalletTransaction>(db)));

    private static (AppDbContext db, BookingService svc, Guid scheduleId) Setup(decimal basePrice = 1000)
    {
        var db  = DbHelper.CreateDb();
        var svc = MakeSvc(db);

        var bus   = SeedHelper.MakeBus();
        var route = SeedHelper.MakeRoute();
        db.Buses.Add(bus);
        db.BusRoutes.Add(route);
        var schedule = new BusSchedule { BusId = bus.Id, RouteId = route.Id, DepartureUtc = DateTime.UtcNow.AddHours(3), BasePrice = basePrice };
        db.BusSchedules.Add(schedule);
        db.SaveChanges();

        return (db, svc, schedule.Id);
    }

    private static CreateBookingRequestDto Dto(Guid scheduleId, string? promoCode = null) =>
        new()
        {
            ScheduleId = scheduleId,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "1" }],
            PromoCode  = promoCode
        };

    [Fact]
    public async Task FlatDiscount_AppliedCorrectly()
    {
        var (db, svc, schedId) = Setup(1000);
        db.PromoCodes.Add(SeedHelper.MakePromo("FLAT100", discountType: 1, discountValue: 100));
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "FLAT100"));

        Assert.Equal(900m, result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
        Assert.Equal("FLAT100", result.PromoCode);
    }

    [Fact]
    public async Task PercentageDiscount_AppliedCorrectly()
    {
        var (db, svc, schedId) = Setup(1000);
        db.PromoCodes.Add(SeedHelper.MakePromo("PCT10", discountType: 2, discountValue: 10));
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "PCT10"));

        Assert.Equal(900m, result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
    }

    [Fact]
    public async Task MaxDiscountCap_IsRespected()
    {
        var (db, svc, schedId) = Setup(1000);
        db.PromoCodes.Add(new PromoCode { Code = "CAPPED", DiscountType = 2, DiscountValue = 50, MaxDiscountAmount = 200, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "CAPPED"));

        Assert.Equal(800m, result.TotalAmount);
        Assert.Equal(200m, result.DiscountAmount);
    }

    [Fact]
    public async Task UsedCount_IncrementedAfterBooking()
    {
        var (db, svc, schedId) = Setup(500);
        var promo = SeedHelper.MakePromo("USE1", discountValue: 50);
        db.PromoCodes.Add(promo);
        db.SaveChanges();

        await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "USE1"));

        var updated = db.PromoCodes.Find(promo.Id)!;
        Assert.Equal(1, updated.UsedCount);
    }

    [Fact]
    public async Task MaxUsesReached_PromoIgnored()
    {
        var (db, svc, schedId) = Setup(500);
        db.PromoCodes.Add(SeedHelper.MakePromo("MAXED", maxUses: 2, usedCount: 2));
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MAXED"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    [Fact]
    public async Task ExpiredPromo_Ignored()
    {
        var (db, svc, schedId) = Setup(500);
        db.PromoCodes.Add(new PromoCode { Code = "EXP", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(-1) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "EXP"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    [Fact]
    public async Task InactivePromo_Ignored()
    {
        var (db, svc, schedId) = Setup(500);
        db.PromoCodes.Add(new PromoCode { Code = "OFF", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = false, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "OFF"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    [Fact]
    public async Task MinBookingAmountNotMet_PromoIgnored()
    {
        var (db, svc, schedId) = Setup(300);
        db.PromoCodes.Add(SeedHelper.MakePromo("MIN500", minAmount: 500));
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MIN500"));

        Assert.Equal(300m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
    }

    [Fact]
    public async Task NoPromoCode_FullPriceCharged()
    {
        var (_, svc, schedId) = Setup(750);

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, null));

        Assert.Equal(750m, result.TotalAmount);
        Assert.Equal(0m,   result.DiscountAmount);
        Assert.Null(result.PromoCode);
    }

    [Fact]
    public async Task FlatDiscount_CannotExceedTotal()
    {
        var (db, svc, schedId) = Setup(100);
        db.PromoCodes.Add(SeedHelper.MakePromo("BIG", discountValue: 500));
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "BIG"));

        Assert.Equal(0m,   result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
    }
}
