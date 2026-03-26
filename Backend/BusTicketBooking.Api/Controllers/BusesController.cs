using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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

        // Helper to get logged-in userId & role
        private Guid CurrentUserId =>
            Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        private string CurrentRole =>
            User.FindFirstValue(ClaimTypes.Role)
            ?? User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value
            ?? string.Empty;

        // ===== CREATE (Admin creates for any operator, operator creates for self) =====

        [HttpPost]
        public async Task<ActionResult<BusResponseDto>> Create([FromBody] CreateBusRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // If Operator → force OperatorId to your own ID
            if (CurrentRole == Roles.Operator)
                dto.OperatorId = CurrentUserId;

            var result = await _busService.CreateAsync(dto, ct);
            return Created($"/api/buses/{result.Id}", result);
        }

        // ===== GET ALL (Admin → all, Operator → only own) =====

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BusResponseDto>>> GetAll(CancellationToken ct)
        {
            var list = await _busService.GetAllSecuredAsync(CurrentUserId, CurrentRole, ct);
            return Ok(list);
        }

        // ===== GET BY ID (must own bus unless admin) =====

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<BusResponseDto>> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var bus = await _busService.GetByIdSecuredAsync(id, CurrentUserId, CurrentRole, ct);
            return bus is null ? NotFound() : Ok(bus);
        }

        // ===== UPDATE (must own unless admin) =====

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<BusResponseDto>> Update([FromRoute] Guid id,
                                                               [FromBody] UpdateBusRequestDto dto,
                                                               CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _busService.UpdateSecuredAsync(id, dto, CurrentUserId, CurrentRole, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        // ===== UPDATE STATUS (must own unless admin) =====

        [HttpPatch("{id:guid}/status")]
        public async Task<ActionResult<BusResponseDto>> UpdateStatus([FromRoute] Guid id,
                                                                     [FromBody] UpdateBusStatusRequestDto dto,
                                                                     CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _busService.UpdateStatusSecuredAsync(id, dto.Status, CurrentUserId, CurrentRole, ct);
            return updated is null ? NotFound() : Ok(updated);
        }

        // ===== DELETE (must own unless admin) =====

        [HttpDelete("{id:guid}")]
        public async Task<ActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _busService.DeleteSecuredAsync(id, CurrentUserId, CurrentRole, ct);
            return ok ? NoContent() : NotFound();
        }

        // ---------------------------------------------------
        // NEW: by operator identity endpoints
        // These ALSO must be ownership-secured
        // ---------------------------------------------------

        [HttpPost("by-operator")]
        [Authorize(Roles = Roles.Operator)]
        public async Task<IActionResult> CreateByOperator([FromBody] CreateBusByOperatorDto dto, CancellationToken ct)
        {
            // Force username from logged-in operator.
            dto.OperatorUsername = User.Identity!.Name;
            var result = await _busService.CreateByOperatorAsync(dto, ct);
            return Ok(result);
        }

        [HttpGet("{operatorIdentity}/{busCode}")]
        public async Task<IActionResult> GetByCode(string operatorIdentity, string busCode, CancellationToken ct)
        {
            // Prevent operator from reading others' buses.
            if (CurrentRole == Roles.Operator && operatorIdentity != User.Identity!.Name)
                return Forbid();

            var result = await _busService.GetByCodeAsync(operatorIdentity, busCode, ct);
            return result is null ? NotFound() : Ok(result);
        }

        [HttpPatch("{operatorIdentity}/{busCode}/status")]
        public async Task<IActionResult> UpdateStatusByCode(string operatorIdentity,
                                                           string busCode,
                                                           [FromBody] UpdateBusStatusRequestDto body,
                                                           CancellationToken ct)
        {
            if (CurrentRole == Roles.Operator && operatorIdentity != User.Identity!.Name)
                return Forbid();

            var result = await _busService.UpdateStatusByCodeAsync(operatorIdentity, busCode, body.Status, ct);
            return result is null ? NotFound() : Ok(result);
        }
    }
}
