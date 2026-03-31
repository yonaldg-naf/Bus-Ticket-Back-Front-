using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages the in-app wallet for each user.
    /// Handles balance top-ups, booking payments, and refunds.
    /// Every balance change is recorded as a WalletTransaction for a full audit trail.
    /// </summary>
    public class WalletService
    {
        private readonly AppDbContext _db;

        public WalletService(AppDbContext db) => _db = db;

        /// <summary>
        /// Returns the wallet for the given user.
        /// If the user does not have a wallet yet, one is automatically created
        /// with a zero balance and saved to the database.
        /// </summary>
        /// <param name="userId">The ID of the user whose wallet to fetch or create.</param>
        /// <returns>The user's Wallet entity (always non-null).</returns>
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

        /// <summary>
        /// Adds money to the user's wallet balance (top-up or refund).
        /// Also records a "Credit" transaction entry for the audit trail.
        ///
        /// Does nothing if the amount is zero or negative — no transaction is created.
        ///
        /// Common reasons: "TopUp", "CancellationRefund", "OperatorCancelRefund", "BusMissRefund".
        /// </summary>
        /// <param name="userId">The user to credit.</param>
        /// <param name="amount">The amount to add. Must be greater than zero to have any effect.</param>
        /// <param name="reason">Short label for why the credit happened (stored in the transaction).</param>
        /// <param name="bookingId">Optional booking this credit is linked to (for refunds).</param>
        /// <param name="description">Optional human-readable description shown in transaction history.</param>
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
                WalletId     = wallet.Id,
                UserId       = userId,
                Type         = "Credit",
                Amount       = amount,
                BalanceAfter = wallet.Balance,
                Reason       = reason,
                BookingId    = bookingId,
                Description  = description
            });

            await _db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Deducts money from the user's wallet balance (booking payment).
        /// Also records a "Debit" transaction entry for the audit trail.
        ///
        /// Returns false immediately if the wallet balance is less than the requested amount
        /// — the balance is NOT changed and no transaction is recorded.
        /// Returns true immediately (no-op) if the amount is zero or negative.
        ///
        /// Common reasons: "BookingPayment".
        /// </summary>
        /// <param name="userId">The user to debit.</param>
        /// <param name="amount">The amount to deduct. Must be greater than zero to have any effect.</param>
        /// <param name="reason">Short label for why the debit happened (stored in the transaction).</param>
        /// <param name="bookingId">Optional booking this debit is linked to.</param>
        /// <param name="description">Optional human-readable description shown in transaction history.</param>
        /// <returns>True if the debit succeeded; false if the balance was insufficient.</returns>
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
                WalletId     = wallet.Id,
                UserId       = userId,
                Type         = "Debit",
                Amount       = amount,
                BalanceAfter = wallet.Balance,
                Reason       = reason,
                BookingId    = bookingId,
                Description  = description
            });

            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
