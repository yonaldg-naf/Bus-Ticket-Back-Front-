using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class WalletServiceTests
    {
        private WalletService CreateService(out AppDbContext db)
        {
            db = DbHelper.CreateDb();
            return new WalletService(new Repository<Wallet>(db), new Repository<WalletTransaction>(db));
        }

        // ── GetOrCreateAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task GetOrCreateAsync_NoExistingWallet_CreatesNewWallet()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            var wallet = await svc.GetOrCreateAsync(userId);

            Assert.Equal(userId, wallet.UserId);
            Assert.Equal(0, wallet.Balance);
            Assert.Single(db.Wallets.ToList());
        }

        [Fact]
        public async Task GetOrCreateAsync_ExistingWallet_ReturnsExisting()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            db.Wallets.Add(new Wallet { UserId = userId, Balance = 500 });
            await db.SaveChangesAsync();

            var wallet = await svc.GetOrCreateAsync(userId);

            Assert.Equal(500, wallet.Balance);
            Assert.Single(db.Wallets.ToList());
        }

        // ── CreditAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreditAsync_PositiveAmount_IncreasesBalance()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 200, "TopUp");

            var wallet = db.Wallets.First();
            Assert.Equal(200, wallet.Balance);
            Assert.Single(db.WalletTransactions.ToList());
            Assert.Equal("Credit", db.WalletTransactions.First().Type);
            Assert.Equal("TopUp", db.WalletTransactions.First().Reason);
        }

        [Fact]
        public async Task CreditAsync_ZeroAmount_DoesNothing()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 0, "TopUp");

            Assert.Empty(db.Wallets.ToList());
            Assert.Empty(db.WalletTransactions.ToList());
        }

        [Fact]
        public async Task CreditAsync_NegativeAmount_DoesNothing()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, -50, "TopUp");

            Assert.Empty(db.Wallets.ToList());
            Assert.Empty(db.WalletTransactions.ToList());
        }

        [Fact]
        public async Task CreditAsync_SetsBalanceAfterOnTransaction()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 300, "TopUp");

            Assert.Equal(300, db.WalletTransactions.First().BalanceAfter);
        }

        [Fact]
        public async Task CreditAsync_WithBookingId_SetsBookingIdOnTransaction()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            var bookingId = Guid.NewGuid();

            await svc.CreditAsync(userId, 100, "CancellationRefund", bookingId: bookingId);

            Assert.Equal(bookingId, db.WalletTransactions.First().BookingId);
        }

        [Fact]
        public async Task CreditAsync_MultipleCalls_AccumulatesBalance()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.CreditAsync(userId, 100, "TopUp");
            await svc.CreditAsync(userId, 200, "TopUp");

            Assert.Equal(300, db.Wallets.First().Balance);
            Assert.Equal(2, db.WalletTransactions.Count());
        }

        // ── DebitAsync ────────────────────────────────────────────────────────

        [Fact]
        public async Task DebitAsync_SufficientBalance_DeductsAndReturnsTrue()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            db.Wallets.Add(new Wallet { UserId = userId, Balance = 500 });
            await db.SaveChangesAsync();

            var result = await svc.DebitAsync(userId, 200, "BookingPayment");

            Assert.True(result);
            Assert.Equal(300, db.Wallets.First().Balance);
            Assert.Single(db.WalletTransactions.ToList());
            Assert.Equal("Debit", db.WalletTransactions.First().Type);
        }

        [Fact]
        public async Task DebitAsync_InsufficientBalance_ReturnsFalseNoChange()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            db.Wallets.Add(new Wallet { UserId = userId, Balance = 100 });
            await db.SaveChangesAsync();

            var result = await svc.DebitAsync(userId, 500, "BookingPayment");

            Assert.False(result);
            Assert.Equal(100, db.Wallets.First().Balance);
            Assert.Empty(db.WalletTransactions.ToList());
        }

        [Fact]
        public async Task DebitAsync_ZeroAmount_ReturnsTrueNoChange()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            var result = await svc.DebitAsync(userId, 0, "BookingPayment");

            Assert.True(result);
            Assert.Empty(db.Wallets.ToList());
            Assert.Empty(db.WalletTransactions.ToList());
        }

        [Fact]
        public async Task DebitAsync_SetsBalanceAfterOnTransaction()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            db.Wallets.Add(new Wallet { UserId = userId, Balance = 500 });
            await db.SaveChangesAsync();

            await svc.DebitAsync(userId, 200, "BookingPayment");

            Assert.Equal(300, db.WalletTransactions.First().BalanceAfter);
        }

        [Fact]
        public async Task DebitAsync_ExactBalance_SucceedsWithZeroBalance()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();
            db.Wallets.Add(new Wallet { UserId = userId, Balance = 300 });
            await db.SaveChangesAsync();

            var result = await svc.DebitAsync(userId, 300, "BookingPayment");

            Assert.True(result);
            Assert.Equal(0, db.Wallets.First().Balance);
        }
    }
}
