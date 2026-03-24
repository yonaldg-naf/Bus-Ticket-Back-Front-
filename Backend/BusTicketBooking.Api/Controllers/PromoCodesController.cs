using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.PromoCodes;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PromoCodesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PromoCodesController(AppDbContext db) => _db = db;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Operator: create a promo code.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePromoCodeRequestDto dto, CancellationToken ct)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Forbid();

            var exists = await _db.PromoCodes.AnyAsync(p => p.Code == dto.Code.ToUpper(), ct);
            if (exists) return Conflict(new { message = "Promo code already exists." });

            var promo = new PromoCode
            {
                OperatorId = op.Id,
                Code = dto.Code.ToUpper().Trim(),
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinBookingAmount = dto.MinBookingAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                ExpiresAtUtc = dto.ExpiresAtUtc,
                MaxUses = dto.MaxUses,
                IsActive = true
            };

            _db.PromoCodes.Add(promo);
            await _db.SaveChangesAsync(ct);

            return Ok(await MapAsync(promo.Id, ct));
        }

        /// <summary>Operator: get their promo codes.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Ok(Array.Empty<PromoCodeResponseDto>());

            var promos = await _db.PromoCodes
                .Include(p => p.Operator)
                .AsNoTracking()
                .Where(p => p.OperatorId == op.Id)
                .OrderByDescending(p => p.CreatedAtUtc)
                .ToListAsync(ct);

            return Ok(promos.Select(Map));
        }

        /// <summary>Operator: toggle active/inactive.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpPatch("{id:guid}/toggle")]
        public async Task<IActionResult> Toggle([FromRoute] Guid id, CancellationToken ct)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Forbid();

            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id && p.OperatorId == op.Id, ct);
            if (promo is null) return NotFound();

            promo.IsActive = !promo.IsActive;
            promo.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(Map(promo));
        }

        /// <summary>Operator: delete a promo code.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var op = await _db.BusOperators.FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Forbid();

            var promo = await _db.PromoCodes.FirstOrDefaultAsync(p => p.Id == id && p.OperatorId == op.Id, ct);
            if (promo is null) return NotFound();

            _db.PromoCodes.Remove(promo);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        /// <summary>Customer: validate a promo code against a booking amount.</summary>
        [Authorize]
        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] ValidatePromoCodeRequestDto dto, CancellationToken ct)
        {
            var promo = await _db.PromoCodes
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Code == dto.Code.ToUpper() && p.IsActive, ct);

            if (promo is null)
                return Ok(new ValidatePromoCodeResponseDto { IsValid = false, Message = "Invalid or inactive promo code." });

            if (promo.ExpiresAtUtc < DateTime.UtcNow)
                return Ok(new ValidatePromoCodeResponseDto { IsValid = false, Message = "Promo code has expired." });

            if (promo.UsedCount >= promo.MaxUses)
                return Ok(new ValidatePromoCodeResponseDto { IsValid = false, Message = "Promo code usage limit reached." });

            if (promo.MinBookingAmount.HasValue && dto.BookingAmount < promo.MinBookingAmount.Value)
                return Ok(new ValidatePromoCodeResponseDto
                {
                    IsValid = false,
                    Message = $"Minimum booking amount is ₹{promo.MinBookingAmount:0.##}."
                });

            decimal discount = promo.DiscountType == 2
                ? Math.Round(dto.BookingAmount * promo.DiscountValue / 100, 2)
                : promo.DiscountValue;

            if (promo.MaxDiscountAmount.HasValue && discount > promo.MaxDiscountAmount.Value)
                discount = promo.MaxDiscountAmount.Value;

            discount = Math.Min(discount, dto.BookingAmount);

            return Ok(new ValidatePromoCodeResponseDto
            {
                IsValid = true,
                Message = "Promo code applied!",
                Code = promo.Code,
                DiscountAmount = discount,
                FinalAmount = dto.BookingAmount - discount
            });
        }

        /// <summary>Admin: get all promo codes.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var promos = await _db.PromoCodes
                .Include(p => p.Operator)
                .AsNoTracking()
                .OrderByDescending(p => p.CreatedAtUtc)
                .ToListAsync(ct);

            return Ok(promos.Select(Map));
        }

        private static PromoCodeResponseDto Map(PromoCode p) => new()
        {
            Id = p.Id,
            Code = p.Code,
            DiscountType = p.DiscountType,
            DiscountValue = p.DiscountValue,
            MinBookingAmount = p.MinBookingAmount,
            MaxDiscountAmount = p.MaxDiscountAmount,
            ExpiresAtUtc = p.ExpiresAtUtc,
            MaxUses = p.MaxUses,
            UsedCount = p.UsedCount,
            IsActive = p.IsActive,
            CompanyName = p.Operator?.CompanyName ?? string.Empty,
            CreatedAtUtc = p.CreatedAtUtc
        };

        private async Task<PromoCodeResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var p = await _db.PromoCodes.Include(x => x.Operator).FirstOrDefaultAsync(x => x.Id == id, ct);
            return p is null ? null : Map(p);
        }
    }
}
