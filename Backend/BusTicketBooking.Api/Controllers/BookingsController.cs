using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
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
        private readonly BusTicketBooking.Contexts.AppDbContext _db;

        public BookingsController(IBookingService bookings, BusTicketBooking.Contexts.AppDbContext db)
        {
            _bookings = bookings;
            _db = db;
        }

        private Guid GetUserId()
        {
            var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
        }

        // ===== Id-based (kept) =====

        /// <summary>Create a booking by ScheduleId (legacy).</summary>
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
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("my")]
        [ProducesResponseType(typeof(IEnumerable<BookingResponseDto>), 200)]
        public async Task<ActionResult<IEnumerable<BookingResponseDto>>> GetMy(CancellationToken ct)
            => Ok(await _bookings.GetMyAsync(GetUserId(), ct));

        [Authorize]
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(BookingResponseDto), 200)]
        public async Task<ActionResult<BookingResponseDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            var item = await _bookings.GetByIdForUserAsync(GetUserId(), id, allowPriv, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [Authorize]
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(204)]
        public async Task<ActionResult> Cancel([FromRoute] Guid id, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            try
            {
                var ok = await _bookings.CancelAsync(GetUserId(), id, allowPriv, ct);
                return ok ? NoContent() : NotFound();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("{id:guid}/pay")]
        [ProducesResponseType(typeof(BookingResponseDto), 200)]
        public async Task<ActionResult<BookingResponseDto>> Pay([FromRoute] Guid id, [FromBody] PayBookingRequestDto dto, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            try
            {
                var updated = await _bookings.PayAsync(GetUserId(), id, dto.Amount, dto.ProviderReference, allowPriv, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // ===== Operator Stats =====

        /// <summary>Returns booking totals for all buses owned by the calling operator.</summary>
        [Authorize(Roles = Roles.Operator)]
        [HttpGet("operator-stats")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> GetOperatorStats(CancellationToken ct)
        {
            var userId = GetUserId();

            // Find the operator profile
            var op = await _db.BusOperators
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.UserId == userId, ct);

            if (op is null) return Ok(new { totalBookings = 0, confirmedBookings = 0, revenue = 0m });

            // Buses owned by this operator
            var busIds = await _db.Buses
                .AsNoTracking()
                .Where(b => b.OperatorId == op.Id)
                .Select(b => b.Id)
                .ToListAsync(ct);

            // Schedules for those buses
            var scheduleIds = await _db.BusSchedules
                .AsNoTracking()
                .Where(s => busIds.Contains(s.BusId))
                .Select(s => s.Id)
                .ToListAsync(ct);

            // Aggregate bookings
            var bookings = await _db.Bookings
                .AsNoTracking()
                .Where(b => scheduleIds.Contains(b.ScheduleId))
                .ToListAsync(ct);

            return Ok(new
            {
                totalBookings = bookings.Count,
                confirmedBookings = bookings.Count(b => b.Status == BusTicketBooking.Models.Enums.BookingStatus.Confirmed),
                revenue = bookings
                    .Where(b => b.Status == BusTicketBooking.Models.Enums.BookingStatus.Confirmed)
                    .Sum(b => b.TotalAmount)
            });
        }

        // ===== NEW: by-keys (FE-friendly) =====

        /// <summary>Create a booking by busCode + departureUtc.</summary>
        [Authorize(Roles = Roles.Customer + "," + Roles.Operator + "," + Roles.Admin)]
        [HttpPost("by-keys")]
        [ProducesResponseType(typeof(BookingResponseDto), 200)]
        public async Task<IActionResult> CreateByKeys([FromBody] CreateBookingByKeysRequestDto dto, CancellationToken ct)
        {
            try
            {
                var result = await _bookings.CreateByKeysAsync(GetUserId(), dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                // Known business-rule errors (seat taken, invalid seat, schedule not found, bus not available)
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // TODO: inject ILogger<BookingsController> and log details here
                // _logger.LogError(ex, "CreateByKeys failed for user {UserId} and bus {BusCode}", GetUserId(), dto?.BusCode);
                return Conflict(new { message = "Could not create booking. " + ex.Message });
            }
        }

        /// <summary>Cancel booking (POST variant for FE symmetry).</summary>
        [Authorize(Roles = Roles.Customer + "," + Roles.Operator + "," + Roles.Admin)]
        [HttpPost("{bookingId:guid}/cancel")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> CancelPost([FromRoute] Guid bookingId, CancellationToken ct)
        {
            var allowPriv = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.Operator);
            var ok = await _bookings.CancelAsync(GetUserId(), bookingId, allowPriv, ct);
            return ok ? Ok() : NotFound();
        }
    }
}