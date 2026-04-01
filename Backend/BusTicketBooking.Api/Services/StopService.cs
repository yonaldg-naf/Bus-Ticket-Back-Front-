using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Stops;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages bus stops and cities.
    /// Public read methods are used by the search page to populate city/stop dropdowns.
    /// Admin CRUD methods allow the admin to add, edit, or remove stops from the system.
    ///
    /// Note: GetCitiesAsync and GetStopsByCityAsync use AppDbContext directly because they
    /// require GroupBy and Select projections that the generic IRepository cannot express.
    /// All write operations (Create, Update, Delete) use IRepository.
    /// </summary>
    public class StopService : IStopService
    {
        private readonly AppDbContext _db;
        private readonly IRepository<Stop> _stops;

        public StopService(AppDbContext db, IRepository<Stop> stops)
        {
            _db    = db;
            _stops = stops;
        }

        // ── Public read operations (require projection — use _db) ─────────────

        /// <summary>
        /// Returns all unique cities with their stop counts, sorted A–Z.
        /// Uses DbContext directly because GroupBy + Select projection cannot be
        /// expressed through the generic repository.
        /// </summary>
        public async Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default)
        {
            return await _db.Stops
                .AsNoTracking()
                .GroupBy(s => s.City)
                .Select(g => new CityResponseDto { City = g.Key, StopCount = g.Count() })
                .OrderBy(x => x.City)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Returns all stops in a specific city, sorted A–Z by name.
        /// Uses DbContext directly because of the Select projection to DTO.
        /// Returns an empty list if the city name is blank or not found.
        /// </summary>
        public async Task<IEnumerable<StopResponseDto>> GetStopsByCityAsync(string city, CancellationToken ct = default)
        {
            city = (city ?? "").Trim();
            if (string.IsNullOrWhiteSpace(city))
                return Enumerable.Empty<StopResponseDto>();

            return await _db.Stops
                .AsNoTracking()
                .Where(s => s.City == city)
                .OrderBy(s => s.Name)
                .Select(s => new StopResponseDto
                {
                    Id        = s.Id,
                    City      = s.City,
                    Name      = s.Name,
                    Latitude  = s.Latitude,
                    Longitude = s.Longitude
                })
                .ToListAsync(ct);
        }

        // ── Admin CRUD operations (use repository) ────────────────────────────

        /// <summary>
        /// Creates a new bus stop. City and Name are trimmed before saving.
        /// </summary>
        public async Task<StopResponseDto> CreateAsync(CreateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = new Stop
            {
                City      = dto.City.Trim(),
                Name      = dto.Name.Trim(),
                Latitude  = dto.Latitude,
                Longitude = dto.Longitude
            };

            entity = await _stops.AddAsync(entity, ct);

            return new StopResponseDto
            {
                Id        = entity.Id,
                City      = entity.City,
                Name      = entity.Name,
                Latitude  = entity.Latitude,
                Longitude = entity.Longitude
            };
        }

        /// <summary>
        /// Updates an existing stop's city, name, and coordinates.
        /// Returns null if no stop with the given ID exists.
        /// </summary>
        public async Task<StopResponseDto?> UpdateAsync(Guid id, UpdateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _stops.GetByIdAsync(id, ct);
            if (entity == null) return null;

            entity.City      = dto.City.Trim();
            entity.Name      = dto.Name.Trim();
            entity.Latitude  = dto.Latitude;
            entity.Longitude = dto.Longitude;

            await _stops.UpdateAsync(entity, ct);

            return new StopResponseDto
            {
                Id        = entity.Id,
                City      = entity.City,
                Name      = entity.Name,
                Latitude  = entity.Latitude,
                Longitude = entity.Longitude
            };
        }

        /// <summary>
        /// Permanently deletes a stop. Returns false if not found.
        /// </summary>
        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _stops.GetByIdAsync(id, ct);
            if (entity == null) return false;

            await _stops.RemoveAsync(entity, ct);
            return true;
        }

        /// <summary>
        /// Renames all stops in a city to a new city name.
        /// Updates every stop that has the current city name in a single batch.
        /// Returns the number of stops updated.
        /// Returns 0 if no stops exist with the given city name.
        /// </summary>
        public async Task<int> RenameCityAsync(string currentCity, string newCity, CancellationToken ct = default)
        {
            currentCity = (currentCity ?? "").Trim();
            newCity     = (newCity     ?? "").Trim();

            if (string.IsNullOrWhiteSpace(currentCity) || string.IsNullOrWhiteSpace(newCity))
                throw new InvalidOperationException("City names cannot be blank.");

            if (string.Equals(currentCity, newCity, StringComparison.Ordinal))
                return 0;

            var stops = (await _stops.FindAsync(s => s.City == currentCity, ct)).ToList();
            if (!stops.Any()) return 0;

            foreach (var stop in stops)
            {
                stop.City = newCity;
                await _stops.UpdateAsync(stop, ct);
            }

            return stops.Count;
        }
    }
}
