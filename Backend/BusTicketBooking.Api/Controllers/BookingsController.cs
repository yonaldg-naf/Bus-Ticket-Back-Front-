using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

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

        private string CurrentRole =>
            User.FindFirstValue(ClaimTypes.Role)
            ?? User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value
            ?? string.Empty;

        [Authorize]
        [HttpPost]
        [ProducesResponseType(typeof(BookingResponseDto), 201)]
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

        [Authorize]
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<BookingResponseDto>>> GetMy(CancellationToken ct)
            => Ok(await _bookings.GetMyAsync(GetUserId(), ct));

        [Authorize]
        [HttpGet("{id:guid}")]
        public async Task<ActionResult<BookingResponseDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            var item = await _bookings.GetByIdForUserAsync(GetUserId(), id, allowPriv, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [Authorize]
        [HttpPost("{id:guid}/pay")]
        public async Task<ActionResult<BookingResponseDto>> Pay([FromRoute] Guid id, [FromBody] PayBookingRequestDto dto, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            try
            {
                var updated = await _bookings.PayAsync(GetUserId(), id, dto.Amount, dto.ProviderReference, dto.UseWallet, allowPriv, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
        [HttpGet("operator-stats")]
        public async Task<IActionResult> GetOperatorStats(CancellationToken ct)
            => Ok(await _bookings.GetOperatorStatsAsync(GetUserId(), ct));

        [Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
        [HttpGet("schedule/{scheduleId:guid}")]
        public async Task<IActionResult> GetBySchedule([FromRoute] Guid scheduleId, CancellationToken ct)
        {
            try
            {
                var result = await _bookings.GetByScheduleAsync(scheduleId, GetUserId(), CurrentRole, ct);
                return Ok(result);
            }
            catch (BusTicketBooking.Exceptions.ForbiddenException) { return Forbid(); }
        }

        [Authorize(Roles = Roles.Customer + "," + Roles.Operator + "," + Roles.Admin)]
        [HttpPost("by-keys")]
        public async Task<IActionResult> CreateByKeys([FromBody] CreateBookingByKeysRequestDto dto, CancellationToken ct)
        {
            try
            {
                var result = await _bookings.CreateByKeysAsync(GetUserId(), dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception) { return Conflict(new { message = "Could not create booking. Please try again." }); }
        }

        [Authorize(Roles = Roles.Customer + "," + Roles.Operator + "," + Roles.Admin)]
        [HttpPost("{bookingId:guid}/cancel")]
        public async Task<IActionResult> CancelPost([FromRoute] Guid bookingId, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            try
            {
                var ok = await _bookings.CancelAsync(GetUserId(), bookingId, allowPriv, ct);
                return ok ? Ok() : NotFound();
            }
            catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
            catch (InvalidOperationException ex)   { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Customer)]
        [HttpPost("{bookingId:guid}/bus-miss")]
        public async Task<IActionResult> BusMiss([FromRoute] Guid bookingId, CancellationToken ct)
        {
            try
            {
                var result = await _bookings.BusMissAsync(GetUserId(), bookingId, ct);
                return Ok(new
                {
                    bookingId      = result.BookingId,
                    status         = result.Status,
                    originalAmount = result.OriginalAmount,
                    refundAmount   = result.RefundAmount,
                    message        = result.Message
                });
            }
            catch (BusTicketBooking.Exceptions.NotFoundException ex)   { return NotFound(new { message = ex.Message }); }
            catch (BusTicketBooking.Exceptions.ValidationException ex) { return BadRequest(new { message = ex.Message }); }
        }
    }
}
