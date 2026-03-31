using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SchedulesController : ControllerBase
    {
        private readonly IScheduleService _schedules;
        private readonly AppDbContext _db;

        public SchedulesController(IScheduleService schedules, AppDbContext db)
        {
            _schedules = schedules;
            _db = db;
        }

        private Guid CurrentUserId =>
            Guid.TryParse(User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        private string CurrentRole =>
            User.FindFirstValue(System.Security.Claims.ClaimTypes.Role)
            ?? User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value
            ?? string.Empty;

        // ===== Id-based (kept) =====

        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ScheduleResponseDto>), 200)]
        public async Task<ActionResult<IEnumerable<ScheduleResponseDto>>> GetAll(CancellationToken ct)
            => Ok(await _schedules.GetAllSecuredAsync(CurrentUserId, CurrentRole, ct));

        ///
        [AllowAnonymous]
        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(ScheduleResponseDto), 200)]
        public async Task<ActionResult<ScheduleResponseDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var item = await _schedules.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpPost]
        [ProducesResponseType(typeof(ScheduleResponseDto), 201)]
        public async Task<ActionResult<ScheduleResponseDto>> Create([FromBody] CreateScheduleRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _schedules.CreateAsync(dto, ct);
                return Created($"/api/schedules/{created.Id}", created);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(ScheduleResponseDto), 200)]
        public async Task<ActionResult<ScheduleResponseDto>> Update([FromRoute] Guid id, [FromBody] UpdateScheduleRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _schedules.UpdateAsync(id, dto, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(204)]
        public async Task<ActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _schedules.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        /// <summary>Cancel a schedule with a reason (marks as cancelled, does NOT delete).</summary>
        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpPatch("{id:guid}/cancel")]
        [ProducesResponseType(typeof(ScheduleResponseDto), 200)]
        public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] CancelScheduleRequestDto dto, CancellationToken ct)
        {
            var result = await _schedules.CancelAsync(id, dto.Reason, ct);
            return result is null ? NotFound() : Ok(result);
        }

        // ===== Search endpoints (POST with body) =====

        [AllowAnonymous]
        [HttpPost("search")]
        [ProducesResponseType(typeof(PagedResult<ScheduleResponseDto>), 200)]
        public async Task<ActionResult<PagedResult<ScheduleResponseDto>>> Search(
            [FromBody] SearchSchedulesRequestDto dto,
            CancellationToken ct)
        {
            if (dto.FromStopId == Guid.Empty || dto.ToStopId == Guid.Empty)
                return BadRequest(new { message = "FromStopId and ToStopId are required." });

            var req = new PagedRequestDto { Page = dto.Page, PageSize = dto.PageSize, SortBy = dto.SortBy, SortDir = dto.SortDir };
            var res = await _schedules.SearchAsync(dto.FromStopId, dto.ToStopId, dto.Date, req, ct, dto.UtcOffsetMinutes);
            return Ok(res);
        }

        [AllowAnonymous]
        [HttpPost("search-by-city")]
        [ProducesResponseType(typeof(PagedResult<ScheduleResponseDto>), 200)]
        public async Task<ActionResult<PagedResult<ScheduleResponseDto>>> SearchByCity(
            [FromBody] SearchSchedulesByCityRequestDto dto,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(dto.FromCity) || string.IsNullOrWhiteSpace(dto.ToCity))
                return BadRequest(new { message = "FromCity and ToCity are required." });

            var fc = dto.FromCity.Trim();
            var tc = dto.ToCity.Trim();

            var fromStops = await _db.Stops.AsNoTracking().Where(s => s.City == fc).OrderBy(s => s.Name).ToListAsync(ct);
            var toStops   = await _db.Stops.AsNoTracking().Where(s => s.City == tc).OrderBy(s => s.Name).ToListAsync(ct);

            if (fromStops.Count == 0 || toStops.Count == 0)
                return NotFound(new { message = "Could not find one or both cities. Check spelling or seed data." });

            var req = new PagedRequestDto { Page = dto.Page, PageSize = dto.PageSize, SortBy = dto.SortBy, SortDir = dto.SortDir };

            var unique = new Dictionary<Guid, ScheduleResponseDto>();
            foreach (var fs in fromStops)
                foreach (var ts in toStops)
                {
                    var pageResult = await _schedules.SearchAsync(fs.Id, ts.Id, dto.Date, req, ct, dto.UtcOffsetMinutes);
                    foreach (var item in pageResult.Items)
                        unique[item.Id] = item;
                }

            var filtered = unique.Values.AsEnumerable();
            var desc = string.Equals(dto.SortDir, "desc", StringComparison.OrdinalIgnoreCase);
            filtered = (dto.SortBy ?? "departure").Trim().ToLowerInvariant() switch
            {
                "price"     => desc ? filtered.OrderByDescending(x => x.BasePrice)    : filtered.OrderBy(x => x.BasePrice),
                "buscode"   => desc ? filtered.OrderByDescending(x => x.BusCode)      : filtered.OrderBy(x => x.BusCode),
                "routecode" => desc ? filtered.OrderByDescending(x => x.RouteCode)    : filtered.OrderBy(x => x.RouteCode),
                _           => desc ? filtered.OrderByDescending(x => x.DepartureUtc) : filtered.OrderBy(x => x.DepartureUtc),
            };

            var total = filtered.LongCount();
            var skip  = Math.Max(0, (dto.Page - 1) * dto.PageSize);
            var take  = Math.Max(1, dto.PageSize);

            return Ok(new PagedResult<ScheduleResponseDto>
            {
                Page      = dto.Page,
                PageSize  = dto.PageSize,
                TotalCount = total,
                Items     = filtered.Skip(skip).Take(take).ToList()
            });
        }

        [AllowAnonymous]
        [HttpGet("{id:guid}/seats")]
        [ProducesResponseType(typeof(SeatAvailabilityResponseDto), 200)]
        public async Task<ActionResult<SeatAvailabilityResponseDto>> GetSeatAvailability([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var result = await _schedules.GetAvailabilityAsync(id, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // ===== NEW: by-keys =====

        /// <summary>Create a schedule by operator + busCode + routeCode (UTC or Local+TZ).</summary>
        [HttpPost("by-keys")]
        [Authorize(Roles = Roles.Operator)]
        [ProducesResponseType(typeof(ScheduleResponseDto), 200)]
        public async Task<IActionResult> CreateByKeys([FromBody] CreateScheduleByKeysRequestDto dto, CancellationToken ct)
            => Ok(await _schedules.CreateByKeysAsync(dto, ct));

        /// <summary>Search schedules by From/To names + date (body).</summary>
        [HttpPost("search-by-keys")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResult<ScheduleResponseDto>), 200)]
        public async Task<IActionResult> SearchByKeys([FromBody] SearchSchedulesByKeysRequestDto dto, CancellationToken ct)
            => Ok(await _schedules.SearchByKeysAsync(dto, ct));

        /// <summary>Seat availability by busCode + departureUtc (ISO UTC).</summary>
        [HttpGet("{busCode}/{departureUtc}/availability")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(SeatAvailabilityResponseDto), 200)]
        public async Task<IActionResult> GetAvailabilityByKeys([FromRoute] string busCode, [FromRoute] DateTime departureUtc, CancellationToken ct)
            => Ok(await _schedules.GetAvailabilityByKeysAsync(busCode, departureUtc, ct));

        /// <summary>Delete a schedule by busCode + departureUtc.</summary>
        [HttpDelete("{busCode}/{departureUtc}")]
        [Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
        [ProducesResponseType(204)]
        public async Task<IActionResult> DeleteByKeys([FromRoute] string busCode, [FromRoute] DateTime departureUtc, CancellationToken ct)
        {
            var ok = await _schedules.DeleteByKeysAsync(busCode, departureUtc, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}