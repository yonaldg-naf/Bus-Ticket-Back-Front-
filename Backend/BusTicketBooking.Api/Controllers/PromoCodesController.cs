using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.PromoCodes;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PromoCodesController : ControllerBase
    {
        private readonly IPromoCodeService _promoCodeService;

        public PromoCodesController(IPromoCodeService promoCodeService) => _promoCodeService = promoCodeService;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Operator: create a promo code.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePromoCodeRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _promoCodeService.CreateAsync(UserId, dto, ct);
            return Ok(result);
        }

        /// <summary>Operator: get their promo codes.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
        {
            var result = await _promoCodeService.GetMyAsync(UserId, ct);
            return Ok(result);
        }

        /// <summary>Admin: get all promo codes.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var result = await _promoCodeService.GetAllAsync(ct);
            return Ok(result);
        }

        /// <summary>Operator: toggle active/inactive.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpPatch("{id:guid}/toggle")]
        public async Task<IActionResult> Toggle([FromRoute] Guid id, CancellationToken ct)
        {
            var result = await _promoCodeService.ToggleAsync(UserId, id, ct);
            return result is null ? NotFound() : Ok(result);
        }

        /// <summary>Operator: delete a promo code.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            await _promoCodeService.DeleteAsync(UserId, id, ct);
            return NoContent();
        }

        /// <summary>Customer: validate a promo code against a booking amount.</summary>
        [Authorize]
        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] ValidatePromoCodeRequestDto dto, CancellationToken ct)
        {
            var result = await _promoCodeService.ValidateAsync(dto, ct);
            return Ok(result);
        }
    }
}
