using System;

namespace BusTicketBooking.Models
{
    /// <summary>Discount / promo code created by an operator.</summary>
    public class PromoCode : BaseEntity
    {
        public Guid OperatorId { get; set; }

        public string Code { get; set; } = string.Empty;

        /// <summary>Flat (1) or Percentage (2).</summary>
        public int DiscountType { get; set; } = 1;

        /// <summary>Amount (flat) or percent value (0–100).</summary>
        public decimal DiscountValue { get; set; }

        public decimal? MinBookingAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }

        public DateTime ExpiresAtUtc { get; set; }
        public int MaxUses { get; set; } = 100;
        public int UsedCount { get; set; } = 0;
        public bool IsActive { get; set; } = true;

        public BusOperator? Operator { get; set; }
    }
}
