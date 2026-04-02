using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages the in-app wallet for each user.
    /// Handles balance top-ups, booking payments, and refunds.
    /// Every balance change is recorded as a WalletTransaction for a full audit trail.
    /// </summary>
    public class WalletService : IWalletService
    {
        private readonly IRepository<Wallet> _wallets;
        private readonly IRepository<WalletTransaction> _transactions;

        public WalletService(IRepository<Wallet> wallets, IRepository<WalletTransaction> transactions)
        {
            _wallets      = wallets;
            _transactions = transactions;
        }

        /// <summary>
        /// Returns the wallet for the given user.
        /// If the user does not have a wallet yet, one is automatically created
        /// with a zero balance and saved to the database.
        /// </summary>
        public async Task<Wallet> GetOrCreateAsync(Guid userId, CancellationToken ct = default)
        {
            // Use tracked query so the wallet can be updated in the same DbContext scope
            var wallet = (await _wallets.FindAsync(w => w.UserId == userId, ct)).FirstOrDefault();
            if (wallet is null)
            {
                wallet = new Wallet { UserId = userId, Balance = 0 };
                wallet = await _wallets.AddAsync(wallet, ct);
            }
            else
            {
                // Re-fetch as tracked so UpdateAsync works without identity conflict
                wallet = await _wallets.GetByIdAsync(wallet.Id, ct) ?? wallet;
            }
            return wallet;
        }

        /// <summary>
        /// Adds money to the user's wallet balance (top-up or refund).
        /// Also records a "Credit" transaction entry for the audit trail.
        /// Does nothing if the amount is zero or negative.
        /// </summary>
        public async Task CreditAsync(
            Guid userId, decimal amount, string reason,
            Guid? bookingId = null, string? description = null,
            CancellationToken ct = default)
        {
            if (amount <= 0) return;

            var wallet = await GetOrCreateAsync(userId, ct);
            wallet.Balance      += amount;
            wallet.UpdatedAtUtc  = DateTime.UtcNow;
            await _wallets.UpdateAsync(wallet, ct);

            await _transactions.AddAsync(new WalletTransaction
            {
                WalletId     = wallet.Id,
                UserId       = userId,
                Type         = "Credit",
                Amount       = amount,
                BalanceAfter = wallet.Balance,
                Reason       = reason,
                BookingId    = bookingId,
                Description  = description
            }, ct);
        }

        /// <summary>
        /// Deducts money from the user's wallet balance (booking payment).
        /// Returns false if the balance is insufficient — nothing is changed.
        /// Returns true immediately (no-op) if the amount is zero or negative.
        /// </summary>
        public async Task<bool> DebitAsync(
            Guid userId, decimal amount, string reason,
            Guid? bookingId = null, string? description = null,
            CancellationToken ct = default)
        {
            if (amount <= 0) return true;

            var wallet = await GetOrCreateAsync(userId, ct);
            if (wallet.Balance < amount) return false;

            wallet.Balance      -= amount;
            wallet.UpdatedAtUtc  = DateTime.UtcNow;
            await _wallets.UpdateAsync(wallet, ct);

            await _transactions.AddAsync(new WalletTransaction
            {
                WalletId     = wallet.Id,
                UserId       = userId,
                Type         = "Debit",
                Amount       = amount,
                BalanceAfter = wallet.Balance,
                Reason       = reason,
                BookingId    = bookingId,
                Description  = description
            }, ct);

            return true;
        }
    }
}
