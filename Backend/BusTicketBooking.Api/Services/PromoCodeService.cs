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
    public class PromoCodeService : IPromoCodeService
    {
        private readonly AppDbContext _db;

        public PromoCodeService(AppDbContext db) => _db = db;

        public async Task<PromoCodeResponseDto> CreateAsync(Guid operatorUserId, CreatePromoCodeRequestDto dto, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct)
                ?? throw new ForbiddenException("Operator profile not found.");

            var exists = await _db.PromoCodes.AnyAsync(p => p.Code == dto.Code.ToUpper(), ct);
            if (exists) throw new ConflictException("Promo code already exists.");

            var promo = new PromoCode
            {
                OperatorId       = op.Id,
                Code             = dto.Code.ToUpper().Trim(),
                DiscountType     = dto.DiscountType,
                DiscountValue    = dto.DiscountValue,
                MinBookingAmount = dto.MinBookingAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                ExpiresAtUtc     = dto.ExpiresAtUtc,
                MaxUses          = dto.MaxUses,
                IsActive         = true
            };

            _db.PromoCodes.Add(promo);
            await _db.SaveChangesAsync(ct);

            return await MapAsync(promo.Id, ct)
                ?? throw new InvalidOperationException("Failed to load created promo code.");
        }

        public async Task<IEnumerable<PromoCodeResponseDto>> GetMyAsync(Guid operatorUserId, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct);
            if (op is null) return Array.Empty<PromoCodeResponseDto>();

            var promos = await _db.PromoCodes
                .Include(p => p.Operator)
                .AsNoTracking()
                .Where(p => p.OperatorId == op.Id)
                .OrderByDescending(p => p.CreatedAtUtc)
                .ToListAsync(ct);

            return promos.Select(Map);
        }

        public async Task<IEnumerable<PromoCodeResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var promos = await _db.PromoCodes
                .Include(p => p.Operator)
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAtUtc)
                .ToListAsync(ct);

            return promos.Select(Map);
        }

        public async Task<PromoCodeResponseDto?> ToggleAsync(Guid operatorUserId, Guid id, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct)
                ?? throw new ForbiddenException("Operator profile not found.");

            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id && p.OperatorId == op.Id, ct)
                ?? throw new NotFoundException("Promo code not found.");

            promo.IsActive     = !promo.IsActive;
            promo.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Map(promo);
        }

        public async Task<bool> DeleteAsync(Guid operatorUserId, Guid id, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct)
                ?? throw new ForbiddenException("Operator profile not found.");

            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id && p.OperatorId == op.Id, ct)
                ?? throw new NotFoundException("Promo code not found.");

            _db.PromoCodes.Remove(promo);
            await _db.SaveChangesAsync(ct);
            return true;
        }

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
            Id               = p.Id,
            Code             = p.Code,
            DiscountType     = p.DiscountType,
            DiscountValue    = p.DiscountValue,
            MinBookingAmount = p.MinBookingAmount,
            MaxDiscountAmount = p.MaxDiscountAmount,
            ExpiresAtUtc     = p.ExpiresAtUtc,
            MaxUses          = p.MaxUses,
            UsedCount        = p.UsedCount,
            IsActive         = p.IsActive,
            CompanyName      = p.Operator?.CompanyName ?? string.Empty,
            CreatedAtUtc     = p.CreatedAtUtc
        };

        private async Task<PromoCodeResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var p = await _db.PromoCodes.Include(x => x.Operator).FirstOrDefaultAsync(x => x.Id == id, ct);
            return p is null ? null : Map(p);
        }
    }
}
