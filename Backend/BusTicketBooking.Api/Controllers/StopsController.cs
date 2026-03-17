using Microsoft.AspNetCore.Mvc;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Dtos.Stops;

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
        public async Task<ActionResult<IEnumerable<CityResponseDto>>> GetCities()
        {
            var data = await _stopService.GetCitiesAsync();
            return Ok(data);
        }

        // GET: api/Stops/by-city/{city}
        [HttpGet("by-city/{city}")]
        public async Task<ActionResult<IEnumerable<StopResponseDto>>> GetByCity(string city)
        {
            var data = await _stopService.GetStopsByCityAsync(city);
            return Ok(data);
        }

        // POST: api/Stops
        [HttpPost]
        public async Task<ActionResult<StopResponseDto>> Create(CreateStopRequestDto dto)
        {
            var created = await _stopService.CreateAsync(dto);
            return Ok(created);
        }

        // PUT: api/Stops/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<StopResponseDto>> Update(Guid id, UpdateStopRequestDto dto)
        {
            var updated = await _stopService.UpdateAsync(id, dto);
            return updated == null ? NotFound() : Ok(updated);
        }

        // DELETE: api/Stops/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(Guid id)
        {
            var ok = await _stopService.DeleteAsync(id);
            return ok ? Ok() : NotFound();
        }
    }
}
