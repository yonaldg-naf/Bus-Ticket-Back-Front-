using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Xunit;

namespace BusTicketBooking.Tests.Services;

public class PromoCodeTests
{
    private static BookingService MakeSvc(AppDbContext db) =>
        new(new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db);

    private static (AppDbContext db, BookingService svc, Guid scheduleId) Setup(decimal basePrice = 1000)
    {
        var db = DbHelper.CreateInMemory();
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

        return (db, svc, schedule.Id);
    }

    private static CreateBookingRequestDto Dto(Guid scheduleId, string? promoCode = null) =>
        new()
        {
            ScheduleId = scheduleId,
            Passengers = [new BookingPassengerDto { Name = "Alice", SeatNo = "1" }],
            PromoCode = promoCode
        };

    [Fact]
    public async Task FlatDiscount_AppliedCorrectly()
    {
        var (db, svc, schedId) = Setup(1000);
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "FLAT100", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
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
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "PCT10", DiscountType = 2, DiscountValue = 10, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "PCT10"));

        Assert.Equal(900m, result.TotalAmount);
        Assert.Equal(100m, result.DiscountAmount);
    }

    [Fact]
    public async Task MaxDiscountCap_IsRespected()
    {
        var (db, svc, schedId) = Setup(1000);
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "CAPPED", DiscountType = 2, DiscountValue = 50, MaxDiscountAmount = 200, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "CAPPED"));

        Assert.Equal(800m, result.TotalAmount);
        Assert.Equal(200m, result.DiscountAmount);
    }

    [Fact]
    public async Task UsedCount_IncrementedAfterBooking()
    {
        var (db, svc, schedId) = Setup(500);
        var op = db.BusOperators.First();
        var promo = new PromoCode { OperatorId = op.Id, Code = "USE1", DiscountType = 1, DiscountValue = 50, MaxUses = 5, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) };
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
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "MAXED", DiscountType = 1, DiscountValue = 100, MaxUses = 2, UsedCount = 2, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MAXED"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m, result.DiscountAmount);
    }

    [Fact]
    public async Task ExpiredPromo_Ignored()
    {
        var (db, svc, schedId) = Setup(500);
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "EXP", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(-1) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "EXP"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m, result.DiscountAmount);
    }

    [Fact]
    public async Task InactivePromo_Ignored()
    {
        var (db, svc, schedId) = Setup(500);
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "OFF", DiscountType = 1, DiscountValue = 100, MaxUses = 10, IsActive = false, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "OFF"));

        Assert.Equal(500m, result.TotalAmount);
        Assert.Equal(0m, result.DiscountAmount);
    }

    [Fact]
    public async Task MinBookingAmountNotMet_PromoIgnored()
    {
        var (db, svc, schedId) = Setup(300); // base price 300
        var op = db.BusOperators.First();
        db.PromoCodes.Add(new PromoCode { OperatorId = op.Id, Code = "MIN500", DiscountType = 1, DiscountValue = 50, MinBookingAmount = 500, MaxUses = 10, IsActive = true, ExpiresAtUtc = DateTime.UtcNow.AddDays(10) });
        db.SaveChanges();

        var result = await svc.CreateAsync(Guid.NewGuid(), Dto(schedId, "MIN500"));

        Assert.Equal(300m, result.TotalAmount); // no discount, min not met
    }
}
