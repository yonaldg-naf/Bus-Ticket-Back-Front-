using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Routes;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class RouteService : IRouteService
    {
        private readonly IRepository<BusRoute> _routes;
        private readonly IRepository<RouteStop> _routeStops;
        private readonly IRepository<Stop> _stops;
        private readonly AppDbContext _db;

        public RouteService(
            IRepository<BusRoute> routes,
            IRepository<RouteStop> routeStops,
            IRepository<Stop> stops,
            AppDbContext db)        {
            _routes     = routes;
            _routeStops = routeStops;
            _stops      = stops;
            _db         = db;
        }

        public async Task<IEnumerable<RouteResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var data = await _db.BusRoutes
                .Include(r => r.RouteStops).ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .ToListAsync(ct);

            return data.Select(MapRoute);
        }

        public async Task<RouteResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var route = await _db.BusRoutes
                .Include(r => r.RouteStops).ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, ct);

            return route is null ? null : MapRoute(route);
        }

        public async Task<RouteResponseDto> CreateAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            if (dto.Stops.Count < 2) throw new InvalidOperationException("A route must contain at least two stops.");

            var duplicate = (await _routes.FindAsync(r => r.RouteCode == dto.RouteCode, ct)).Any();
            if (duplicate) throw new InvalidOperationException("RouteCode already exists.");

            var route = new BusRoute { RouteCode = dto.RouteCode.Trim() };
            route = await _routes.AddAsync(route, ct);

            var rsEntities = new List<RouteStop>();
            for (int i = 0; i < dto.Stops.Count; i++)
            {
                var s = dto.Stops[i];
                if (string.IsNullOrWhiteSpace(s.City) || string.IsNullOrWhiteSpace(s.Name))
                    throw new InvalidOperationException("Stop City and Name are required.");

                var stop = await GetOrCreateStopAsync(s.City, s.Name, ct);
                rsEntities.Add(new RouteStop { RouteId = route.Id, StopId = stop.Id, Order = i + 1 });
            }

            await _routeStops.AddRangeAsync(rsEntities, ct);
            return await GetByIdAsync(route.Id, ct) ?? throw new InvalidOperationException("Route creation failed.");
        }

        public async Task<RouteResponseDto?> UpdateAsync(Guid id, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            var route = await _routes.GetByIdAsync(id, ct);
            if (route is null) return null;

            if (!string.Equals(route.RouteCode, dto.NewRouteCode, StringComparison.Ordinal))
            {
                var dup = (await _routes.FindAsync(r => r.RouteCode == dto.NewRouteCode && r.Id != route.Id, ct)).Any();
                if (dup) throw new InvalidOperationException("RouteCode already exists.");
                route.RouteCode = dto.NewRouteCode.Trim();
            }

            if (dto.Stops.Count < 2) throw new InvalidOperationException("A route must contain at least two stops.");

            route.UpdatedAtUtc = DateTime.UtcNow;
            await _routes.UpdateAsync(route, ct);

            var existing = await _routeStops.FindAsync(rs => rs.RouteId == route.Id, ct);
            if (existing.Any()) await _routeStops.RemoveRangeAsync(existing, ct);

            var rsEntities = new List<RouteStop>();
            for (int i = 0; i < dto.Stops.Count; i++)
            {
                var s = dto.Stops[i];
                if (string.IsNullOrWhiteSpace(s.City) || string.IsNullOrWhiteSpace(s.Name))
                    throw new InvalidOperationException("Stop City and Name are required.");

                var stop = await GetOrCreateStopAsync(s.City, s.Name, ct);
                rsEntities.Add(new RouteStop { RouteId = route.Id, StopId = stop.Id, Order = i + 1 });
            }
            await _routeStops.AddRangeAsync(rsEntities, ct);

            return await GetByIdAsync(route.Id, ct);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var route = await _routes.GetByIdAsync(id, ct);
            if (route is null) return false;

            var rs = await _routeStops.FindAsync(s => s.RouteId == route.Id, ct);
            if (rs.Any()) await _routeStops.RemoveRangeAsync(rs, ct);
            await _routes.RemoveAsync(route, ct);
            return true;
        }

        private async Task<Stop> GetOrCreateStopAsync(string city, string name, CancellationToken ct)
        {
            city = city.Trim();
            name = name.Trim();
            var existing = await _db.Stops.FirstOrDefaultAsync(s => s.City == city && s.Name == name, ct);
            if (existing != null) return existing;
            return await _stops.AddAsync(new Stop { City = city, Name = name }, ct);
        }

        private static RouteResponseDto MapRoute(BusRoute route) => new()
        {
            Id           = route.Id,
            RouteCode    = route.RouteCode,
            CreatedAtUtc = route.CreatedAtUtc,
            UpdatedAtUtc = route.UpdatedAtUtc,
            Stops        = route.RouteStops
                .OrderBy(rs => rs.Order)
                .Select(rs => new RouteStopViewDto
                {
                    StopId             = rs.StopId,
                    Order              = rs.Order,
                    ArrivalOffsetMin   = rs.ArrivalOffsetMin,
                    DepartureOffsetMin = rs.DepartureOffsetMin,
                    City               = rs.Stop?.City ?? string.Empty,
                    Name               = rs.Stop?.Name ?? string.Empty
                }).ToList()
        };
    }
}
