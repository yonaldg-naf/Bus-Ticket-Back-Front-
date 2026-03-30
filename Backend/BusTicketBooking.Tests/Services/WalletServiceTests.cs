using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class WalletServiceTests
    {
        // ── GetOrCreateAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task GetOrCreate_CreatesWallet_WhenUserHasNone()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            var wallet = await svc.GetOrCreateAsync(userId);

            Assert.NotNull(wallet);
            Assert.Equal(userId, wallet.UserId);
            Assert.Equal(0m, wallet.Balance);
        }

        [Fact]
        public async Task GetOrCreate_ReturnsExisting_WhenWalletExists()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            // Seed an existing wallet with balance
            var existing = SeedHelper.MakeWallet(userId, 500m);
            db.Wallets.Add(existing);
            await db.SaveChangesAsync();

            var wallet = await svc.GetOrCreateAsync(userId);

            Assert.Equal(500m, wallet.Balance);
            // Should not create a second wallet
            Assert.Single(db.Wallets.Where(w => w.UserId == userId));
        }

        // ── CreditAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task Credit_IncreasesBalance_AndCreatesTransaction()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 200m, "TopUp");

            var wallet = db.Wallets.Single(w => w.UserId == userId);
            Assert.Equal(200m, wallet.Balance);

            var tx = db.WalletTransactions.Single(t => t.UserId == userId);
            Assert.Equal("Credit", tx.Type);
            Assert.Equal(200m, tx.Amount);
            Assert.Equal(200m, tx.BalanceAfter);
            Assert.Equal("TopUp", tx.Reason);
        }

        [Fact]
        public async Task Credit_DoesNothing_WhenAmountIsZero()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 0m, "TopUp");

            // No wallet or transaction should be created
            Assert.Empty(db.Wallets);
            Assert.Empty(db.WalletTransactions);
        }

        [Fact]
        public async Task Credit_DoesNothing_WhenAmountIsNegative()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, -50m, "Refund");

            Assert.Empty(db.Wallets);
        }

        [Fact]
        public async Task Credit_AccumulatesBalance_OnMultipleCredits()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 100m, "TopUp");
            await svc.CreditAsync(userId, 250m, "Refund");

            var wallet = db.Wallets.Single(w => w.UserId == userId);
            Assert.Equal(350m, wallet.Balance);
            Assert.Equal(2, db.WalletTransactions.Count(t => t.UserId == userId));
        }

        // ── DebitAsync ────────────────────────────────────────────────────────

        [Fact]
        public async Task Debit_DecreasesBalance_AndReturnsTrue_WhenSufficientFunds()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            db.Wallets.Add(SeedHelper.MakeWallet(userId, 1000m));
            await db.SaveChangesAsync();

            var result = await svc.DebitAsync(userId, 300m, "BookingPayment");

            Assert.True(result);
            var wallet = db.Wallets.Single(w => w.UserId == userId);
            Assert.Equal(700m, wallet.Balance);

            var tx = db.WalletTransactions.Single(t => t.UserId == userId);
            Assert.Equal("Debit", tx.Type);
            Assert.Equal(300m, tx.Amount);
            Assert.Equal(700m, tx.BalanceAfter);
        }

        [Fact]
        public async Task Debit_ReturnsFalse_WhenInsufficientFunds()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            db.Wallets.Add(SeedHelper.MakeWallet(userId, 100m));
            await db.SaveChangesAsync();

            var result = await svc.DebitAsync(userId, 500m, "BookingPayment");

            Assert.False(result);
            // Balance should be unchanged
            var wallet = db.Wallets.Single(w => w.UserId == userId);
            Assert.Equal(100m, wallet.Balance);
            // No transaction should be recorded
            Assert.Empty(db.WalletTransactions);
        }

        [Fact]
        public async Task Debit_ReturnsTrue_WhenAmountIsZero()
        {
            using var db = DbHelper.CreateDb();
            var svc    = new WalletService(db);
            var userId = Guid.NewGuid();

            var result = await svc.DebitAsync(userId, 0m, "BookingPayment");

            Assert.True(result);
            // No wallet or transaction created for zero amount
            Assert.Empty(db.Wallets);
        }

        [Fact]
        public async Task Debit_LinksTransaction_ToBookingId_WhenProvided()
        {
            using var db = DbHelper.CreateDb();
            var svc       = new WalletService(db);
            var userId    = Guid.NewGuid();
            var bookingId = Guid.NewGuid();

            db.Wallets.Add(SeedHelper.MakeWallet(userId, 500m));
            await db.SaveChangesAsync();

            await svc.DebitAsync(userId, 200m, "BookingPayment", bookingId: bookingId);

            var tx = db.WalletTransactions.Single(t => t.UserId == userId);
            Assert.Equal(bookingId, tx.BookingId);
        }
    }
}
