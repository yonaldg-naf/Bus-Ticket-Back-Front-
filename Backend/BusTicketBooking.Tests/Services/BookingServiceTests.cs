using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class BookingServiceTests
{
    private static (BookingService svc, BusTicketBooking.Contexts.AppDbContext db) Build()
    {
        var db     = DbHelper.CreateDb();
        var wallet = new WalletService(
            new Repository<BusTicketBooking.Models.Wallet>(db),
            new Repository<BusTicketBooking.Models.WalletTransaction>(db));
        var svc = new BookingService(
            new Repository<Booking>(db),
            new Repository<BookingPassenger>(db),
            new Repository<Payment>(db),
            new Repository<BusSchedule>(db),
            db, wallet);
        return (svc, db);
    }

    // ── GetMyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMy_ReturnsOnlyCurrentUsersBookings()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);

        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        db.Bookings.AddRange(
            SeedHelper.MakeBooking(userId1, schedule.Id),
            SeedHelper.MakeBooking(userId1, schedule.Id),
            SeedHelper.MakeBooking(userId2, schedule.Id)
        );
        await db.SaveChangesAsync();

        var result = (await svc.GetMyAsync(userId1)).ToList();

        Assert.Equal(2, result.Count);
        Assert.All(result, b => Assert.Equal(userId1, b.UserId));
    }

    [Fact]
    public async Task GetMy_ReturnsEmpty_WhenUserHasNoBookings()
    {
        var (svc, _) = Build();
        Assert.Empty(await svc.GetMyAsync(Guid.NewGuid()));
    }

    // ── GetByIdForUserAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetById_ReturnsBooking_ForOwner()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var result = await svc.GetByIdForUserAsync(userId, booking.Id);

        Assert.NotNull(result);
        Assert.Equal(booking.Id, result!.Id);
    }

    [Fact]
    public async Task GetById_ReturnsNull_ForDifferentUser()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var ownerId = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(ownerId, schedule.Id);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var result = await svc.GetByIdForUserAsync(Guid.NewGuid(), booking.Id, allowPrivileged: false);
        Assert.Null(result);
    }

    [Fact]
    public async Task GetById_ReturnsBooking_ForPrivilegedUser()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var ownerId = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(ownerId, schedule.Id);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var result = await svc.GetByIdForUserAsync(Guid.NewGuid(), booking.Id, allowPrivileged: true);
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetById_ReturnsNull_WhenBookingNotFound()
    {
        var (svc, _) = Build();
        Assert.Null(await svc.GetByIdForUserAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Cancel_SetsCancelledStatus_ForPendingBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var result = await svc.CancelAsync(userId, booking.Id);

        Assert.True(result);
        Assert.Equal(BookingStatus.Cancelled, db.Bookings.Find(booking.Id)!.Status);
    }

    [Fact]
    public async Task Cancel_ReturnsFalse_WhenBookingNotFound()
    {
        var (svc, _) = Build();
        Assert.False(await svc.CancelAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    [Fact]
    public async Task Cancel_ReturnsTrue_WhenAlreadyCancelled()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Cancelled);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        Assert.True(await svc.CancelAsync(userId, booking.Id));
    }

    [Fact]
    public async Task Cancel_Throws_WhenUserDoesNotOwnBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var ownerId = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(ownerId, schedule.Id, BookingStatus.Pending);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => svc.CancelAsync(Guid.NewGuid(), booking.Id, allowPrivileged: false));
    }

    [Fact]
    public async Task Cancel_IssuesRefund_ForConfirmedPaidBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(72), price: 500m);

        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Confirmed, 500m);
        var payment = SeedHelper.MakePayment(booking.Id, PaymentStatus.Success, 500m);
        booking.Payment  = payment;
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        await svc.CancelAsync(userId, booking.Id);

        var wallet = db.Wallets.SingleOrDefault(w => w.UserId == userId);
        Assert.NotNull(wallet);
        Assert.Equal(500m, wallet!.Balance);
    }

    [Fact]
    public async Task Cancel_NoRefund_ForPendingUnpaidBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(72), price: 500m);

        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending, 500m);
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        await svc.CancelAsync(userId, booking.Id);

        Assert.Empty(db.Wallets);
    }

    // ── PayAsync ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Pay_ConfirmsBooking_WithMockGateway()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending, 500m);
        var payment = SeedHelper.MakePayment(booking.Id, PaymentStatus.Initiated, 500m);
        booking.Payment  = payment;
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        var result = await svc.PayAsync(userId, booking.Id, 500m, "PAY-123");

        Assert.NotNull(result);
        Assert.Equal(BookingStatus.Confirmed, result!.Status);
    }

    [Fact]
    public async Task Pay_ConfirmsBooking_WithWallet_WhenSufficientBalance()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending, 300m);
        var payment = SeedHelper.MakePayment(booking.Id, PaymentStatus.Initiated, 300m);
        booking.Payment  = payment;
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        db.Wallets.Add(SeedHelper.MakeWallet(userId, 1000m));
        await db.SaveChangesAsync();

        var result = await svc.PayAsync(userId, booking.Id, 300m, "WALLET", useWallet: true);

        Assert.NotNull(result);
        Assert.Equal(BookingStatus.Confirmed, result!.Status);
        Assert.Equal(700m, db.Wallets.Single(w => w.UserId == userId).Balance);
    }

    [Fact]
    public async Task Pay_Throws_WhenWalletInsufficientBalance()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending, 500m);
        var payment = SeedHelper.MakePayment(booking.Id, PaymentStatus.Initiated, 500m);
        booking.Payment  = payment;
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        db.Wallets.Add(SeedHelper.MakeWallet(userId, 100m));
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.PayAsync(userId, booking.Id, 500m, "WALLET", useWallet: true));
    }

    [Fact]
    public async Task Pay_ReturnsNull_WhenBookingNotFound()
    {
        var (svc, _) = Build();
        Assert.Null(await svc.PayAsync(Guid.NewGuid(), Guid.NewGuid(), 100m, "REF"));
    }

    [Fact]
    public async Task Pay_ReturnsNull_WhenUserDoesNotOwnBooking()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var ownerId = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(ownerId, schedule.Id, BookingStatus.Pending, 500m);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        Assert.Null(await svc.PayAsync(Guid.NewGuid(), booking.Id, 500m, "REF", allowPrivileged: false));
    }

    [Fact]
    public async Task Pay_Throws_WhenBookingIsCancelled()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Cancelled, 500m);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.PayAsync(userId, booking.Id, 500m, "REF", allowPrivileged: true));
    }

    [Fact]
    public async Task Pay_UsesFullAmount_WhenAmountIsZero()
    {
        var (svc, db) = Build();
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db);
        var userId  = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Pending, 750m);
        var payment = SeedHelper.MakePayment(booking.Id, PaymentStatus.Initiated, 750m);
        booking.Payment  = payment;
        booking.Schedule = schedule;
        db.Bookings.Add(booking);
        db.Payments.Add(payment);
        await db.SaveChangesAsync();

        var result = await svc.PayAsync(userId, booking.Id, 0m, "PAY-AUTO");

        Assert.NotNull(result);
        Assert.Equal(750m, db.Payments.Single(p => p.BookingId == booking.Id).Amount);
    }
}
