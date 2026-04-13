using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Models;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StopsController : ControllerBase
    {
        private readonly IStopService _stopService;

        public StopsController(IStopService stopService)
        {
            _stopService = stopService;
        }

        // GET: api/Stops/cities
        [HttpGet("cities")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<CityResponseDto>>> GetCities(CancellationToken ct = default)
        {
            var data = await _stopService.GetCitiesAsync(ct);
            return Ok(data);
        }

        // GET: api/Stops/by-city/{city}
        [HttpGet("by-city/{city}")]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<StopResponseDto>>> GetByCity(string city, CancellationToken ct = default)
        {
            var data = await _stopService.GetStopsByCityAsync(city, ct);
            return Ok(data);
        }

        // POST: api/Stops
        [HttpPost]
        [Authorize(Roles = Roles.Admin)]
        public async Task<ActionResult<StopResponseDto>> Create(CreateStopRequestDto dto, CancellationToken ct = default)
        {
            var created = await _stopService.CreateAsync(dto, ct);
            return Ok(created);
        }

        // PUT: api/Stops/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<ActionResult<StopResponseDto>> Update(Guid id, UpdateStopRequestDto dto, CancellationToken ct = default)
        {
            var updated = await _stopService.UpdateAsync(id, dto, ct);
            return updated == null ? NotFound() : Ok(updated);
        }

        // DELETE: api/Stops/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<ActionResult> Delete(Guid id, CancellationToken ct = default)
        {
            var ok = await _stopService.DeleteAsync(id, ct);
            return ok ? Ok() : NotFound();
        }

        // PUT: api/Stops/cities/{city}
        [HttpPut("cities/{city}")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> RenameCity(string city, [FromBody] UpdateCityRequestDto dto, CancellationToken ct = default)
        {
            var count = await _stopService.RenameCityAsync(city, dto.NewCityName, ct);
            return count == 0 ? NotFound() : Ok(new { updated = count });
        }
    }
}
