using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StopsController : ControllerBase
    {
        private readonly IStopService _stops;
        public StopsController(IStopService stops) => _stops = stops;

        /// <summary>
        /// Returns distinct cities that have at least one stop, with stop counts.
        /// </summary>
        [HttpGet("cities")]
        [ProducesResponseType(typeof(IEnumerable<CityResponseDto>), 200)]
        public async Task<IActionResult> GetCities(CancellationToken ct)
        {
            var data = await _stops.GetCitiesAsync(ct);
            return Ok(data);
        }

        /// <summary>
        /// Returns stops for the specified city (for dropdown #2).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<StopResponseDto>), 200)]
        public async Task<IActionResult> GetStopsByCity([FromQuery] string city, CancellationToken ct)
        {
            var data = await _stops.GetStopsByCityAsync(city, ct);
            return Ok(data);
        }
    }
}