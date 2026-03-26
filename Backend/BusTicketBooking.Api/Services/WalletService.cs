using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class WalletService
    {
        private readonly AppDbContext _db;

        public WalletService(AppDbContext db) => _db = db;

        // ── Get or create wallet ──────────────────────────────────────────────

        public async Task<Wallet> GetOrCreateAsync(Guid userId, CancellationToken ct = default)
        {
            var wallet = await _db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
            if (wallet is null)
            {
                wallet = new Wallet { UserId = userId, Balance = 0 };
                _db.Wallets.Add(wallet);
                await _db.SaveChangesAsync(ct);
            }
            return wallet;
        }

        // ── Credit (refund / top-up) ──────────────────────────────────────────

        public async Task CreditAsync(
            Guid userId, decimal amount, string reason,
            Guid? bookingId = null, string? description = null,
            CancellationToken ct = default)
        {
            if (amount <= 0) return;

            var wallet = await GetOrCreateAsync(userId, ct);
            wallet.Balance += amount;
            wallet.UpdatedAtUtc = DateTime.UtcNow;

            _db.WalletTransactions.Add(new WalletTransaction
            {
                WalletId = wallet.Id,
                UserId = userId,
                Type = "Credit",
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Reason = reason,
                BookingId = bookingId,
                Description = description
            });

            await _db.SaveChangesAsync(ct);
        }

        // ── Debit (booking payment) ───────────────────────────────────────────

        /// <summary>
        /// Deducts amount from wallet. Returns false if insufficient balance.
        /// </summary>
        public async Task<bool> DebitAsync(
            Guid userId, decimal amount, string reason,
            Guid? bookingId = null, string? description = null,
            CancellationToken ct = default)
        {
            if (amount <= 0) return true;

            var wallet = await GetOrCreateAsync(userId, ct);
            if (wallet.Balance < amount) return false;

            wallet.Balance -= amount;
            wallet.UpdatedAtUtc = DateTime.UtcNow;

            _db.WalletTransactions.Add(new WalletTransaction
            {
                WalletId = wallet.Id,
                UserId = userId,
                Type = "Debit",
                Amount = amount,
                BalanceAfter = wallet.Balance,
                Reason = reason,
                BookingId = bookingId,
                Description = description
            });

            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
