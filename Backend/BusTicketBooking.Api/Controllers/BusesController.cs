using System;
using System.Collections.Generic;
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
    [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
    public class BusesController : ControllerBase
    {
        private readonly IBusService _busService;

        public BusesController(IBusService busService) => _busService = busService;

        // ===== Id-based (kept) =====

        [HttpPost]
        [ProducesResponseType(typeof(BusResponseDto), 201)]
        public async Task<ActionResult<BusResponseDto>> Create([FromBody] CreateBusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _busService.CreateAsync(dto, ct);
                return Created($"/api/buses/{result.Id}", result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<BusResponseDto>), 200)]
        public async Task<ActionResult<IEnumerable<BusResponseDto>>> GetAll(CancellationToken ct)
            => Ok(await _busService.GetAllAsync(ct));

        [HttpGet("{id:guid}")]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<ActionResult<BusResponseDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var bus = await _busService.GetByIdAsync(id, ct);
            return bus is null ? NotFound() : Ok(bus);
        }

        [HttpPut("{id:guid}")]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<ActionResult<BusResponseDto>> Update([FromRoute] Guid id, [FromBody] UpdateBusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var updated = await _busService.UpdateAsync(id, dto, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpPatch("{id:guid}/status")]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<ActionResult<BusResponseDto>> UpdateStatus([FromRoute] Guid id, [FromBody] UpdateBusStatusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var updated = await _busService.UpdateStatusAsync(id, dto.Status, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        [HttpDelete("{id:guid}")]
        [ProducesResponseType(204)]
        public async Task<ActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _busService.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }

        // ===== NEW: by-operator / by-code =====

        /// <summary>Create a bus by operator identity (username/company).</summary>
        [HttpPost("by-operator")]
        [Authorize(Roles = Roles.Operator)]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<IActionResult> CreateByOperator([FromBody] CreateBusByOperatorDto dto, CancellationToken ct)
        {
            var result = await _busService.CreateByOperatorAsync(dto, ct);
            return Ok(result);
        }

        /// <summary>Get bus by operator identity + busCode (operator username or company name).</summary>
        [HttpGet("{operatorIdentity}/{busCode}")]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<IActionResult> GetByCode([FromRoute] string operatorIdentity, [FromRoute] string busCode, CancellationToken ct)
        {
            var result = await _busService.GetByCodeAsync(operatorIdentity, busCode, ct);
            return result is null ? NotFound() : Ok(result);
        }

        /// <summary>Update bus status by operator identity + busCode.</summary>
        [HttpPatch("{operatorIdentity}/{busCode}/status")]
        [ProducesResponseType(typeof(BusResponseDto), 200)]
        public async Task<IActionResult> UpdateStatusByCode([FromRoute] string operatorIdentity, [FromRoute] string busCode, [FromBody] UpdateBusStatusRequestDto body, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _busService.UpdateStatusByCodeAsync(operatorIdentity, busCode, body.Status, ct);
            return result is null ? NotFound() : Ok(result);
        }
    }
}
