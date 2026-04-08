using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
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

        public SchedulesController(IScheduleService schedules)
        {
            _schedules = schedules;
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

        /// <summary>Create a schedule (GUID-based). Operator only — admin cannot create schedules.</summary>
        [Authorize(Roles = Roles.Operator)]
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

            if (User.IsInRole(Roles.Operator) && !await _schedules.IsOwnedByOperatorAsync(id, CurrentUserId, ct))
                return NotFound();

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
            if (User.IsInRole(Roles.Operator) && !await _schedules.IsOwnedByOperatorAsync(id, CurrentUserId, ct))
                return NotFound();

            var ok = await _schedules.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        /// <summary>Cancel a schedule with a reason (marks as cancelled, does NOT delete).</summary>
        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [HttpPatch("{id:guid}/cancel")]
        [ProducesResponseType(typeof(ScheduleResponseDto), 200)]
        public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] CancelScheduleRequestDto dto, CancellationToken ct)
        {
            if (User.IsInRole(Roles.Operator) && !await _schedules.IsOwnedByOperatorAsync(id, CurrentUserId, ct))
                return NotFound();

            var result = await _schedules.CancelAsync(id, dto.Reason, ct);
            return result is null ? NotFound() : Ok(result);
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
    }
}