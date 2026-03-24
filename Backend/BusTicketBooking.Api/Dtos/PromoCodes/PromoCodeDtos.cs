using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.PromoCodes
{
    public class CreatePromoCodeRequestDto
    {
        [Required, MaxLength(50)] public string Code { get; set; } = string.Empty;

        /// <summary>1 = Flat, 2 = Percentage</summary>
        [Range(1, 2)] public int DiscountType { get; set; } = 1;

        [Range(0.01, 100000)] public decimal DiscountValue { get; set; }
        public decimal? MinBookingAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public int MaxUses { get; set; } = 100;
    }

    public class PromoCodeResponseDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public int DiscountType { get; set; }
        public decimal DiscountValue { get; set; }
        public decimal? MinBookingAmount { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public DateTime ExpiresAtUtc { get; set; }
        public int MaxUses { get; set; }
        public int UsedCount { get; set; }
        public bool IsActive { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public DateTime CreatedAtUtc { get; set; }
    }

    public class ValidatePromoCodeRequestDto
    {
        [Required] public string Code { get; set; } = string.Empty;
        public decimal BookingAmount { get; set; }
    }

    public class ValidatePromoCodeResponseDto
    {
        public bool IsValid { get; set; }
        public string? Message { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string Code { get; set; } = string.Empty;
    }
}
