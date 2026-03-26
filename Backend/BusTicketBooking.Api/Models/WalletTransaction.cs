using System;

namespace BusTicketBooking.Models
{
    /// <summary>
    /// Records every credit and debit on a user's wallet.
    /// Type: "Credit" | "Debit"
    /// Reason: "TopUp" | "BookingPayment" | "CancellationRefund" | "BusMissRefund" | "OperatorCancelRefund"
    /// </summary>
    public class WalletTransaction : BaseEntity
    {
        public Guid WalletId { get; set; }
        public Guid UserId { get; set; }

        /// <summary>"Credit" or "Debit"</summary>
        public string Type { get; set; } = string.Empty;

        public decimal Amount { get; set; }

        /// <summary>Balance after this transaction.</summary>
        public decimal BalanceAfter { get; set; }

        public string Reason { get; set; } = string.Empty;

        /// <summary>Optional booking reference.</summary>
        public Guid? BookingId { get; set; }

        public string? Description { get; set; }

        public Wallet? Wallet { get; set; }
    }
}
