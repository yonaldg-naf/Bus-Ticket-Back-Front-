using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SchedulesController : ControllerBase
    {
        private readonly IScheduleService _schedules;

        public SchedulesController(IScheduleService schedules) => _schedules = schedules;

        [Authorize(Roles = Roles.Admin)]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
            => Ok(await _schedules.GetAllAsync(ct));

        [AllowAnonymous]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var item = await _schedules.GetByIdAsync(id, ct);
            return item is null ? NotFound() : Ok(item);
        }

        [Authorize(Roles = Roles.Admin)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateScheduleRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _schedules.CreateAsync(dto, ct);
                return Created($"/api/schedules/{created.Id}", created);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Admin)]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateScheduleRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _schedules.UpdateAsync(id, dto, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [Authorize(Roles = Roles.Admin)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _schedules.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        [Authorize(Roles = Roles.Admin)]
        [HttpPatch("{id:guid}/cancel")]
        public async Task<IActionResult> Cancel([FromRoute] Guid id, [FromBody] CancelScheduleRequestDto dto, CancellationToken ct)
        {
            var result = await _schedules.CancelAsync(id, dto.Reason, ct);
            return result is null ? NotFound() : Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("{id:guid}/seats")]
        public async Task<IActionResult> GetSeatAvailability([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var result = await _schedules.GetAvailabilityAsync(id, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return NotFound(new { message = ex.Message }); }
        }

        [AllowAnonymous]
        [HttpPost("search")]
        public async Task<IActionResult> Search([FromBody] SearchSchedulesByKeysRequestDto dto, CancellationToken ct)
            => Ok(await _schedules.SearchByKeysAsync(dto, ct));
    }
}
