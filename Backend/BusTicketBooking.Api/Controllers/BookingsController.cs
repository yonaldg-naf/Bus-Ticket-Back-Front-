using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookings;

        public BookingsController(IBookingService bookings) => _bookings = bookings;

        private Guid GetUserId()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
        }

        [Authorize(Roles = Roles.Customer)]
        [HttpPost]
        public async Task<ActionResult<BookingResponseDto>> Create([FromBody] CreateBookingRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _bookings.CreateAsync(GetUserId(), dto, ct);
                return Created($"/api/bookings/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Customer)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
            => Ok(await _bookings.GetMyAsync(GetUserId(), ct));

        [Authorize(Roles = Roles.Customer)]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var item = await _bookings.GetByIdForUserAsync(GetUserId(), id, false, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.Customer)]
        [HttpPost("{id:guid}/pay")]
        public async Task<IActionResult> Pay([FromRoute] Guid id, [FromBody] PayBookingRequestDto dto, CancellationToken ct)
        {
            try
            {
                var updated = await _bookings.PayAsync(GetUserId(), id, dto.Amount, dto.ProviderReference, dto.UseWallet, false, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Customer)]
        [HttpPost("{bookingId:guid}/cancel")]
        public async Task<IActionResult> Cancel([FromRoute] Guid bookingId, CancellationToken ct)
        {
            try
            {
                var ok = await _bookings.CancelAsync(GetUserId(), bookingId, false, ct);
                return ok ? Ok() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex)   { return Conflict(new { message = ex.Message }); }
        }
    }
}
