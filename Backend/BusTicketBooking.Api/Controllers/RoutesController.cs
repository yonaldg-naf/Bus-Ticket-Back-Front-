using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
    public class RoutesController : ControllerBase
    {
        private readonly IRouteService _routes;

        public RoutesController(IRouteService routes)
        {
            _routes = routes;
        }

        /// <summary>Get all routes.</summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<RouteResponseDto>), 200)]
        public async Task<ActionResult<IEnumerable<RouteResponseDto>>> GetAll(CancellationToken ct)
        {
            var data = await _routes.GetAllAsync(ct);
            return Ok(data);
        }

        // =========================
        //       by-keys (FE-friendly)
        // =========================

        /// <summary>
        /// Create a route by operator identity + City/StopName list.
        /// Admin must provide OperatorUsername or CompanyName in the body.
        /// Operator automatically uses their own identity.
        /// </summary>
        [HttpPost("by-keys")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [ProducesResponseType(typeof(RouteResponseDto), 200)]
        [ProducesResponseType(typeof(object), 409)]
        public async Task<IActionResult> CreateByKeys(
            [FromBody] CreateRouteByKeysRequestDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Operator can only create routes for themselves
            if (User.IsInRole(Roles.Operator))
                dto.OperatorUsername = User.Identity!.Name;

            try
            {
                var result = await _routes.CreateByKeysAsync(dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get a route by operator identity (username or company name) and routeCode.
        /// operatorIdentity can be either the operator's username OR companyName.
        /// </summary>
        [HttpGet("{operatorIdentity}/{routeCode}")]
        [ProducesResponseType(typeof(RouteResponseDto), 200)]
        public async Task<IActionResult> GetByCode(
            [FromRoute] string operatorIdentity,
            [FromRoute] string routeCode,
            CancellationToken ct)
        {
            var route = await _routes.GetByCodeAsync(operatorIdentity, routeCode, ct);
            return route is null ? NotFound() : Ok(route);
        }

        /// <summary>
        /// Update a route by operator identity + current routeCode.
        /// Admin must provide operatorIdentity in the URL.
        /// Operator can only update their own routes — operatorIdentity is ignored and forced to their username.
        /// </summary>
        [HttpPut("{operatorIdentity}/{routeCode}")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.Operator}")]
        [ProducesResponseType(typeof(RouteResponseDto), 200)]
        [ProducesResponseType(typeof(object), 409)]
        public async Task<IActionResult> UpdateByKeys(
            [FromRoute] string operatorIdentity,
            [FromRoute] string routeCode,
            [FromBody] UpdateRouteByKeysRequestDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Operator can only update their own routes
            if (User.IsInRole(Roles.Operator))
                operatorIdentity = User.Identity!.Name!;

            try
            {
                var updated = await _routes.UpdateByKeysAsync(operatorIdentity, routeCode, dto, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        /// <summary>Delete a route by operator identity + routeCode (by-keys).</summary>
        [HttpDelete("{operatorIdentity}/{routeCode}")]
        [ProducesResponseType(204)]
        public async Task<IActionResult> DeleteByKeys(
            [FromRoute] string operatorIdentity,
            [FromRoute] string routeCode,
            CancellationToken ct)
        {
            // Operator can only delete their own routes
            if (User.IsInRole(Roles.Operator))
                operatorIdentity = User.Identity!.Name!;

            var ok = await _routes.DeleteByKeysAsync(operatorIdentity, routeCode, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}
