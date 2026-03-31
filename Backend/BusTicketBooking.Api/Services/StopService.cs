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
    /// </summary>
    public class StopService : IStopService
    {
        private readonly AppDbContext _db;
        public StopService(AppDbContext db) => _db = db;

        // ── Public read operations ────────────────────────────────────────────

        /// <summary>
        /// Returns a list of all unique cities that have at least one stop,
        /// along with the number of stops in each city.
        /// Results are sorted alphabetically by city name.
        /// Used to populate the "From" and "To" city dropdowns on the search page.
        /// </summary>
        /// <returns>List of cities with their stop counts, ordered A–Z.</returns>
        public async Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default)
        {
            return await _db.Stops
                .AsNoTracking()
                .GroupBy(s => s.City)
                .Select(g => new CityResponseDto
                {
                    City      = g.Key,
                    StopCount = g.Count()
                })
                .OrderBy(x => x.City)
                .ToListAsync(ct);
        }

        /// <summary>
        /// Returns all stops in a specific city, sorted alphabetically by stop name.
        /// Used to populate the stop dropdown after the user selects a city.
        /// Returns an empty list if the city name is blank or not found.
        /// </summary>
        /// <param name="city">The city name to filter by (exact match, trimmed).</param>
        /// <returns>List of stops in that city, ordered A–Z by name.</returns>
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

        // ── Admin CRUD operations ─────────────────────────────────────────────

        /// <summary>
        /// Creates a new bus stop in the system.
        /// City and Name are trimmed of whitespace before saving.
        /// Latitude and Longitude are optional — used for map display.
        /// </summary>
        /// <param name="dto">The stop details to create.</param>
        /// <returns>The newly created stop with its generated ID.</returns>
        public async Task<StopResponseDto> CreateAsync(CreateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = new Stop
            {
                City      = dto.City.Trim(),
                Name      = dto.Name.Trim(),
                Latitude  = dto.Latitude,
                Longitude = dto.Longitude
            };

            _db.Stops.Add(entity);
            await _db.SaveChangesAsync(ct);

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
        /// All fields are replaced with the values from the DTO.
        /// Returns null if no stop with the given ID exists.
        /// </summary>
        /// <param name="id">The ID of the stop to update.</param>
        /// <param name="dto">The new values to apply.</param>
        /// <returns>The updated stop, or null if not found.</returns>
        public async Task<StopResponseDto?> UpdateAsync(Guid id, UpdateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Stops.FindAsync(new object[] { id }, ct);
            if (entity == null) return null;

            entity.City      = dto.City.Trim();
            entity.Name      = dto.Name.Trim();
            entity.Latitude  = dto.Latitude;
            entity.Longitude = dto.Longitude;

            await _db.SaveChangesAsync(ct);

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
        /// Permanently deletes a stop from the system.
        /// Note: if the stop is referenced by any route, the database will throw
        /// a foreign key constraint error (stops are restricted from deletion when in use).
        /// Returns false if no stop with the given ID exists.
        /// </summary>
        /// <param name="id">The ID of the stop to delete.</param>
        /// <returns>True if deleted successfully; false if the stop was not found.</returns>
        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.Stops.FindAsync(new object[] { id }, ct);
            if (entity == null) return false;

            _db.Stops.Remove(entity);
            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
