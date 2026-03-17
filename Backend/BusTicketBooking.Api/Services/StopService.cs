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
    public class StopService : IStopService
    {
        private readonly AppDbContext _db;
        public StopService(AppDbContext db) => _db = db;

        // ========================
        // PUBLIC READ OPERATIONS
        // ========================

        public async Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default)
        {
            return await _db.Stops
                .AsNoTracking()
                .GroupBy(s => s.City)
                .Select(g => new CityResponseDto
                {
                    City = g.Key,
                    StopCount = g.Count()
                })
                .OrderBy(x => x.City)
                .ToListAsync(ct);
        }

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
                    Id = s.Id,
                    City = s.City,
                    Name = s.Name,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude
                })
                .ToListAsync(ct);
        }

        // ======================
        // ADMIN CRUD OPERATIONS
        // ======================

        public async Task<StopResponseDto> CreateAsync(CreateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = new Stop
            {
                City = dto.City.Trim(),
                Name = dto.Name.Trim(),
                Latitude = dto.Latitude,
                Longitude = dto.Longitude
            };

            _db.Stops.Add(entity);
            await _db.SaveChangesAsync(ct);

            return new StopResponseDto
            {
                Id = entity.Id,
                City = entity.City,
                Name = entity.Name,
                Latitude = entity.Latitude,
                Longitude = entity.Longitude
            };
        }

        public async Task<StopResponseDto?> UpdateAsync(Guid id, UpdateStopRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _db.Stops.FindAsync(new object[] { id }, ct);
            if (entity == null) return null;

            entity.City = dto.City.Trim();
            entity.Name = dto.Name.Trim();
            entity.Latitude = dto.Latitude;
            entity.Longitude = dto.Longitude;

            await _db.SaveChangesAsync(ct);

            return new StopResponseDto
            {
                Id = entity.Id,
                City = entity.City,
                Name = entity.Name,
                Latitude = entity.Latitude,
                Longitude = entity.Longitude
            };
        }

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