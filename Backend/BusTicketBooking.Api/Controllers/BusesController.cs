using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.Admin)]
    public class BusesController : ControllerBase
    {
        private readonly IBusService _busService;

        public BusesController(IBusService busService) => _busService = busService;

        [HttpPost]
        public async Task<ActionResult<BusResponseDto>> Create([FromBody] CreateBusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _busService.CreateAsync(dto, ct);
            return Created($"/api/buses/{result.Id}", result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            var list = await _busService.GetAllAsync(ct);
            return Ok(list);
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<BusResponseDto>> Update([FromRoute] Guid id, [FromBody] UpdateBusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var updated = await _busService.UpdateAsync(id, dto, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpPatch("{id:guid}/status")]
        public async Task<ActionResult<BusResponseDto>> UpdateStatus([FromRoute] Guid id, [FromBody] UpdateBusStatusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var updated = await _busService.UpdateStatusAsync(id, dto.Status, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _busService.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}
