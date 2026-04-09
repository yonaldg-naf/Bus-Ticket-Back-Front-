using System;
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
    [Authorize(Roles = Roles.Admin)]
    public class RoutesController : ControllerBase
    {
        private readonly IRouteService _routes;

        public RoutesController(IRouteService routes) => _routes = routes;

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
            => Ok(await _routes.GetAllAsync(ct));

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRouteByKeysRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var result = await _routes.CreateAsync(dto, ct);
                return Ok(result);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken ct)
        {
            var route = await _routes.GetByIdAsync(id, ct);
            return route is null ? NotFound() : Ok(route);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateRouteByKeysRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var updated = await _routes.UpdateAsync(id, dto, ct);
                return updated is null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            var ok = await _routes.DeleteAsync(id, ct);
            return ok ? NoContent() : NotFound();
        }
    }
}
