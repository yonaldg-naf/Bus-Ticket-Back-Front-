using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
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
        private readonly IRepository<BusOperator> _operators;
        private readonly IRepository<User> _users;
        private readonly AppDbContext _db;

        public RouteService(
            IRepository<BusRoute> routes,
            IRepository<RouteStop> routeStops,
            IRepository<Stop> stops,
            IRepository<BusOperator> operators,
            IRepository<User> users,
            AppDbContext db)
        {
            _routes = routes;
            _routeStops = routeStops;
            _stops = stops;
            _operators = operators;
            _users = users;
            _db = db;
        }

        // ===== Existing (Id-based) =====

        public async Task<RouteResponseDto> CreateAsync(CreateRouteRequestDto dto, CancellationToken ct = default)
        {
            ValidateStopsOrdering(dto.Stops.Select((s, i) => new { s.StopId, Order = i + 1 }).Select(x => new RouteStopItemDto { StopId = x.StopId, Order = x.Order }));
            await EnsureStopsExistAsync(dto.Stops.Select(s => s.StopId).Distinct(), ct);

            var duplicate = (await _routes.FindAsync(r => r.OperatorId == dto.OperatorId && r.RouteCode == dto.RouteCode, ct)).Any();
            if (duplicate) throw new InvalidOperationException("RouteCode already exists for this operator.");

            var route = new BusRoute { OperatorId = dto.OperatorId, RouteCode = dto.RouteCode.Trim() };
            route = await _routes.AddAsync(route, ct);

            var rsEntities = dto.Stops
                .OrderBy(s => s.Order)
                .Select(s => new RouteStop
                {
                    RouteId = route.Id,
                    StopId = s.StopId,
                    Order = s.Order,
                    ArrivalOffsetMin = s.ArrivalOffsetMin,
                    DepartureOffsetMin = s.DepartureOffsetMin
                }).ToList();

            await _routeStops.AddRangeAsync(rsEntities, ct);
            return await GetByIdAsync(route.Id, ct) ?? throw new InvalidOperationException("Route creation failed to load.");
        }

        public async Task<IEnumerable<RouteResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var data = await _db.BusRoutes
                .Include(r => r.RouteStops)
                .ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .ToListAsync(ct);

            return data.Select(MapRoute);
        }

        public async Task<RouteResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var route = await _db.BusRoutes
                .Include(r => r.RouteStops)
                .ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, ct);

            return route is null ? null : MapRoute(route);
        }

        public async Task<RouteResponseDto?> UpdateAsync(Guid id, UpdateRouteRequestDto dto, CancellationToken ct = default)
        {
            ValidateStopsOrdering(dto.Stops);
            await EnsureStopsExistAsync(dto.Stops.Select(s => s.StopId).Distinct(), ct);

            var route = await _routes.GetByIdAsync(id, ct);
            if (route is null) return null;

            var dup = (await _routes.FindAsync(r => r.OperatorId == route.OperatorId && r.RouteCode == dto.RouteCode && r.Id != id, ct)).Any();
            if (dup) throw new InvalidOperationException("RouteCode already exists for this operator.");

            route.RouteCode = dto.RouteCode.Trim();
            route.UpdatedAtUtc = DateTime.UtcNow;
            await _routes.UpdateAsync(route, ct);

            var existing = await _routeStops.FindAsync(rs => rs.RouteId == id, ct);
            if (existing.Any()) await _routeStops.RemoveRangeAsync(existing, ct);

            var newStops = dto.Stops
                .OrderBy(s => s.Order)
                .Select(s => new RouteStop
                {
                    RouteId = id,
                    StopId = s.StopId,
                    Order = s.Order,
                    ArrivalOffsetMin = s.ArrivalOffsetMin,
                    DepartureOffsetMin = s.DepartureOffsetMin
                }).ToList();

            await _routeStops.AddRangeAsync(newStops, ct);
            return await GetByIdAsync(id, ct);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var route = await _routes.GetByIdAsync(id, ct);
            if (route is null) return false;

            var rs = await _routeStops.FindAsync(s => s.RouteId == id, ct);
            if (rs.Any()) await _routeStops.RemoveRangeAsync(rs, ct);

            await _routes.RemoveAsync(route, ct);
            return true;
        }

        // ===== NEW (by-keys) =====

        public async Task<RouteResponseDto> CreateByKeysAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            // Resolve operator
            var operatorId = await ResolveOperatorIdAsync(dto.OperatorUsername, dto.CompanyName, ct);

            // Enforce uniqueness
            var duplicate = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == dto.RouteCode, ct)).Any();
            if (duplicate) throw new InvalidOperationException("RouteCode already exists for this operator.");

            if (dto.Stops.Count < 2) throw new InvalidOperationException("A route must contain at least two stops.");

            // Create/get Stop entities in order
            var stopsOrdered = dto.Stops.Select((s, index) => new { s.City, s.Name, Order = index + 1 }).ToList();
            ValidateStopNames(stopsOrdered.Select(x => (x.City, x.Name)));

            var route = new BusRoute { OperatorId = operatorId, RouteCode = dto.RouteCode.Trim() };
            route = await _routes.AddAsync(route, ct);

            var rsEntities = new List<RouteStop>();
            foreach (var s in stopsOrdered)
            {
                var stop = await GetOrCreateStopAsync(s.City, s.Name, ct);
                rsEntities.Add(new RouteStop
                {
                    RouteId = route.Id,
                    StopId = stop.Id,
                    Order = s.Order
                });
            }

            await _routeStops.AddRangeAsync(rsEntities, ct);
            return await GetByIdAsync(route.Id, ct) ?? throw new InvalidOperationException("Route creation failed to load.");
        }

        public async Task<RouteResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var route = await _db.BusRoutes
                .Include(r => r.RouteStops).ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.OperatorId == operatorId && r.RouteCode == routeCode, ct);

            return route is null ? null : MapRoute(route);
        }

        public async Task<RouteResponseDto?> UpdateByKeysAsync(string operatorUsernameOrCompany, string routeCode, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var route = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == routeCode, ct)).FirstOrDefault();
            if (route is null) return null;

            // uniqueness for new code (if changed)
            if (!string.Equals(route.RouteCode, dto.NewRouteCode, StringComparison.Ordinal))
            {
                var dup = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == dto.NewRouteCode && r.Id != route.Id, ct)).Any();
                if (dup) throw new InvalidOperationException("RouteCode already exists for this operator.");
                route.RouteCode = dto.NewRouteCode.Trim();
            }

            if (dto.Stops.Count < 2) throw new InvalidOperationException("A route must contain at least two stops.");
            var stopsOrdered = dto.Stops.Select((s, index) => new { s.City, s.Name, Order = index + 1 }).ToList();
            ValidateStopNames(stopsOrdered.Select(x => (x.City, x.Name)));

            route.UpdatedAtUtc = DateTime.UtcNow;
            await _routes.UpdateAsync(route, ct);

            var existing = await _routeStops.FindAsync(rs => rs.RouteId == route.Id, ct);
            if (existing.Any()) await _routeStops.RemoveRangeAsync(existing, ct);

            var rsEntities = new List<RouteStop>();
            foreach (var s in stopsOrdered)
            {
                var stop = await GetOrCreateStopAsync(s.City, s.Name, ct);
                rsEntities.Add(new RouteStop
                {
                    RouteId = route.Id,
                    StopId = stop.Id,
                    Order = s.Order
                });
            }
            await _routeStops.AddRangeAsync(rsEntities, ct);

            return await GetByIdAsync(route.Id, ct);
        }

        public async Task<bool> DeleteByKeysAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var route = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == routeCode, ct)).FirstOrDefault();
            if (route is null) return false;

            var rs = await _routeStops.FindAsync(s => s.RouteId == route.Id, ct);
            if (rs.Any()) await _routeStops.RemoveRangeAsync(rs, ct);
            await _routes.RemoveAsync(route, ct);
            return true;
        }

        // ===== Helpers =====

        private static void ValidateStopNames(IEnumerable<(string City, string Name)> stops)
        {
            foreach (var (city, name) in stops)
            {
                if (string.IsNullOrWhiteSpace(city) || string.IsNullOrWhiteSpace(name))
                    throw new InvalidOperationException("Stop City and Name are required.");
            }
        }

        private static void ValidateStopsOrdering(IEnumerable<RouteStopItemDto> stops)
        {
            var ordered = stops.OrderBy(s => s.Order).ToList();
            if (ordered.Count < 2)
                throw new InvalidOperationException("A route must contain at least two stops.");

            for (int i = 0; i < ordered.Count; i++)
            {
                if (ordered[i].Order != i + 1)
                    throw new InvalidOperationException("Stop orders must be continuous starting at 1.");
            }

            var dupOrder = ordered.GroupBy(s => s.Order).Any(g => g.Count() > 1);
            if (dupOrder) throw new InvalidOperationException("Duplicate 'Order' values are not allowed.");

            var dupStop = ordered.GroupBy(s => s.StopId).Any(g => g.Count() > 1);
            if (dupStop) throw new InvalidOperationException("A stop cannot appear more than once in a route for v1.");
        }

        private async Task EnsureStopsExistAsync(IEnumerable<Guid> stopIds, CancellationToken ct)
        {
            var ids = stopIds.Distinct().ToList();
            if (!ids.Any()) throw new InvalidOperationException("No stops specified.");
            var found = await _db.Stops.AsNoTracking().Where(s => ids.Contains(s.Id)).Select(s => s.Id).ToListAsync(ct);
            if (found.Count != ids.Count)
            {
                var missing = string.Join(", ", ids.Except(found));
                throw new InvalidOperationException($"One or more StopIds do not exist: {missing}");
            }
        }

        private async Task<Guid> ResolveOperatorIdAsync(string? username, string? companyName, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(username))
            {
                var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username, ct)
                           ?? throw new InvalidOperationException("Operator user not found.");
                var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == user.Id, ct)
                         ?? throw new InvalidOperationException("Operator profile not found for user.");
                return op.Id;
            }

            if (!string.IsNullOrWhiteSpace(companyName))
            {
                var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.CompanyName == companyName, ct)
                         ?? throw new InvalidOperationException("Operator with given company name not found.");
                return op.Id;
            }

            throw new InvalidOperationException("Provide OperatorUsername or CompanyName.");
        }

        private async Task<Stop> GetOrCreateStopAsync(string city, string name, CancellationToken ct)
        {
            city = city.Trim();
            name = name.Trim();

            var existing = await _db.Stops.FirstOrDefaultAsync(s => s.City == city && s.Name == name, ct);
            if (existing != null) return existing;

            var created = new Stop { City = city, Name = name };
            return await _stops.AddAsync(created, ct);
        }

        private static RouteResponseDto MapRoute(BusRoute route)
        {
            var dto = new RouteResponseDto
            {
                Id = route.Id,
                OperatorId = route.OperatorId,
                RouteCode = route.RouteCode,
                CreatedAtUtc = route.CreatedAtUtc,
                UpdatedAtUtc = route.UpdatedAtUtc,
                Stops = route.RouteStops
                    .OrderBy(rs => rs.Order)
                    .Select(rs => new RouteStopViewDto
                    {
                        StopId = rs.StopId,
                        Order = rs.Order,
                        ArrivalOffsetMin = rs.ArrivalOffsetMin,
                        DepartureOffsetMin = rs.DepartureOffsetMin,
                        City = rs.Stop?.City ?? string.Empty,
                        Name = rs.Stop?.Name ?? string.Empty
                    }).ToList()
            };
            return dto;
        }
    }
}