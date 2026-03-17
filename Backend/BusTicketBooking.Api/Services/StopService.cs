using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class StopService : IStopService
    {
        private readonly AppDbContext _db;
        public StopService(AppDbContext db) => _db = db;

        public async Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default)
        {
            // Distinct list of cities with stop counts
            var cities = await _db.Stops
                .AsNoTracking()
                .GroupBy(s => s.City)
                .Select(g => new CityResponseDto { City = g.Key, StopCount = g.Count() })
                .OrderBy(x => x.City)
                .ToListAsync(ct);

            return cities;
        }

        public async Task<IEnumerable<StopResponseDto>> GetStopsByCityAsync(string city, CancellationToken ct = default)
        {
            city = (city ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(city)) return Enumerable.Empty<StopResponseDto>();

            var stops = await _db.Stops
                .AsNoTracking()
                .Where(s => s.City == city)
                .OrderBy(s => s.Name)
                .Select(s => new StopResponseDto
                {
                    Id = s.Id,
                    City = s.City,
                    Name = s.Name,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude
                })
                .ToListAsync(ct);

            return stops;
        }
    }
}