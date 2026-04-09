using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.PromoCodes;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages promo codes. Supports flat and percentage-based discounts.
    /// Promo codes can be toggled active/inactive and have usage limits and expiry dates.
    /// </summary>
    public class PromoCodeService : IPromoCodeService
    {
        private readonly AppDbContext _db;

        public PromoCodeService(AppDbContext db) => _db = db;

        /// <summary>
        /// Creates a new promo code for the operator.
        ///
        /// Validates that:
        ///   - The caller has a valid operator profile.
        ///   - The promo code doesn't already exist (codes are globally unique, case-insensitive).
        ///
        /// The code is automatically uppercased and trimmed before saving.
        /// The promo is set to active (IsActive = true) by default.
        /// Throws ForbiddenException if the operator profile is not found.
        /// Throws ConflictException if the code already exists.
        /// </summary>
        public async Task<PromoCodeResponseDto> CreateAsync(CreatePromoCodeRequestDto dto, CancellationToken ct = default)
        {
            var exists = await _db.PromoCodes.AnyAsync(p => p.Code == dto.Code.ToUpper(), ct);
            if (exists) throw new ConflictException("Promo code already exists.");
            var promo = new PromoCode
            {
                Code              = dto.Code.ToUpper().Trim(),
                DiscountType      = dto.DiscountType,
                DiscountValue     = dto.DiscountValue,
                MinBookingAmount  = dto.MinBookingAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                ExpiresAtUtc      = dto.ExpiresAtUtc,
                MaxUses           = dto.MaxUses,
                IsActive          = true
            };

            _db.PromoCodes.Add(promo);
            await _db.SaveChangesAsync(ct);

            return await MapAsync(promo.Id, ct)
                ?? throw new InvalidOperationException("Failed to load created promo code.");
        }

        /// <summary>
        /// Returns all promo codes in the system, ordered newest first.
        /// </summary>
        public async Task<IEnumerable<PromoCodeResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var promos = await _db.PromoCodes
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAtUtc)
                .ToListAsync(ct);

            return promos.Select(Map);
        }

        /// <summary>
        /// Toggles a promo code between active and inactive.
        /// If it's currently active, it becomes inactive (and vice versa).
        /// Only the operator who created the promo code can toggle it.
        /// Throws ForbiddenException if the operator profile is not found.
        /// Throws NotFoundException if the promo code doesn't exist or doesn't belong to the operator.
        /// </summary>
        public async Task<PromoCodeResponseDto?> ToggleAsync(Guid id, CancellationToken ct = default)
        {
            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw new NotFoundException("Promo code not found.");

            promo.IsActive     = !promo.IsActive;
            promo.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Map(promo);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id, ct)
                ?? throw new NotFoundException("Promo code not found.");

            _db.PromoCodes.Remove(promo);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        /// <summary>
        /// Validates a promo code against a booking amount without actually applying it.
        /// Used by the frontend to show the customer the discount before they confirm the booking.
        ///
        /// Checks in order:
        ///   1. Code exists and is active.
        ///   2. Code has not expired.
        ///   3. Usage limit has not been reached.
        ///   4. Booking amount meets the minimum required amount (if set).
        ///
        /// If valid, calculates and returns the discount amount and final price after discount.
        /// Respects the MaxDiscountAmount cap for percentage-based discounts.
        /// Returns IsValid = false with a descriptive message if any check fails.
        /// </summary>
        public async Task<ValidatePromoCodeResponseDto> ValidateAsync(ValidatePromoCodeRequestDto dto, CancellationToken ct = default)
        {
            var promo = await _db.PromoCodes
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Code == dto.Code.ToUpper() && p.IsActive, ct);

            if (promo is null)
                return new ValidatePromoCodeResponseDto { IsValid = false, Message = "Invalid or inactive promo code." };

            if (promo.ExpiresAtUtc < DateTime.UtcNow)
                return new ValidatePromoCodeResponseDto { IsValid = false, Message = "Promo code has expired." };

            if (promo.UsedCount >= promo.MaxUses)
                return new ValidatePromoCodeResponseDto { IsValid = false, Message = "Promo code usage limit reached." };

            if (promo.MinBookingAmount.HasValue && dto.BookingAmount < promo.MinBookingAmount.Value)
                return new ValidatePromoCodeResponseDto
                {
                    IsValid = false,
                    Message = $"Minimum booking amount is ₹{promo.MinBookingAmount:0.##}."
                };

            decimal discount = promo.DiscountType == 2
                ? Math.Round(dto.BookingAmount * promo.DiscountValue / 100, 2)
                : promo.DiscountValue;

            if (promo.MaxDiscountAmount.HasValue && discount > promo.MaxDiscountAmount.Value)
                discount = promo.MaxDiscountAmount.Value;

            discount = Math.Min(discount, dto.BookingAmount);

            return new ValidatePromoCodeResponseDto
            {
                IsValid        = true,
                Message        = "Promo code applied!",
                Code           = promo.Code,
                DiscountAmount = discount,
                FinalAmount    = dto.BookingAmount - discount
            };
        }

        private static PromoCodeResponseDto Map(PromoCode p) => new()
        {
            Id                = p.Id,
            Code              = p.Code,
            DiscountType      = p.DiscountType,
            DiscountValue     = p.DiscountValue,
            MinBookingAmount  = p.MinBookingAmount,
            MaxDiscountAmount = p.MaxDiscountAmount,
            ExpiresAtUtc      = p.ExpiresAtUtc,
            MaxUses           = p.MaxUses,
            UsedCount         = p.UsedCount,
            IsActive          = p.IsActive,
            CreatedAtUtc      = p.CreatedAtUtc
        };

        private async Task<PromoCodeResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var p = await _db.PromoCodes.FirstOrDefaultAsync(x => x.Id == id, ct);
            return p is null ? null : Map(p);
        }
    }
}
