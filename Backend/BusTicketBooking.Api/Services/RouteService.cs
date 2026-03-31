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
    /// <summary>
    /// Manages bus routes and their ordered stop sequences.
    /// A route defines the path a bus travels — an ordered list of stops
    /// with optional arrival/departure time offsets at each stop.
    ///
    /// Supports two creation styles:
    ///   - ID-based  : caller provides OperatorId and StopId GUIDs directly.
    ///   - Key-based : caller provides operator username/company name and stop city/name strings.
    ///                 Stops are auto-created if they don't exist yet.
    /// </summary>
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
            _routes     = routes;
            _routeStops = routeStops;
            _stops      = stops;
            _operators  = operators;
            _users      = users;
            _db         = db;
        }

        // ── ID-based methods ──────────────────────────────────────────────────

        /// <summary>
        /// Returns all routes in the system with their full ordered stop lists.
        /// </summary>
        public async Task<IEnumerable<RouteResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var data = await _db.BusRoutes
                .Include(r => r.RouteStops)
                .ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .ToListAsync(ct);

            return data.Select(MapRoute);
        }

        /// <summary>
        /// Internal helper — fetches a route by ID with full stop details.
        /// Used by CreateByKeysAsync and UpdateByKeysAsync to return the saved result.
        /// </summary>
        private async Task<RouteResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var route = await _db.BusRoutes
                .Include(r => r.RouteStops)
                .ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id, ct);

            return route is null ? null : MapRoute(route);
        }

        // ── Key-based methods ─────────────────────────────────────────────────

        /// <summary>
        /// Creates a route using operator username/company name and stop city/name strings
        /// instead of GUIDs. Stops are looked up by city+name; if a stop doesn't exist
        /// it is automatically created. This is the preferred method for the operator UI.
        ///
        /// Validates that at least 2 stops are provided and all city/name values are non-empty.
        /// Throws InvalidOperationException if the route code already exists for this operator.
        /// </summary>
        public async Task<RouteResponseDto> CreateByKeysAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(dto.OperatorUsername, dto.CompanyName, ct);

            var duplicate = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == dto.RouteCode, ct)).Any();
            if (duplicate) throw new InvalidOperationException("RouteCode already exists for this operator.");

            if (dto.Stops.Count < 2) throw new InvalidOperationException("A route must contain at least two stops.");

            var stopsOrdered = dto.Stops.Select((s, index) => new { s.City, s.Name, Order = index + 1 }).ToList();
            ValidateStopNames(stopsOrdered.Select(x => (x.City, x.Name)));

            var route = new BusRoute { OperatorId = operatorId, RouteCode = dto.RouteCode.Trim() };
            route = await _routes.AddAsync(route, ct);

            var rsEntities = new List<RouteStop>();
            foreach (var s in stopsOrdered)
            {
                var stop = await GetOrCreateStopAsync(s.City, s.Name, ct);
                rsEntities.Add(new RouteStop { RouteId = route.Id, StopId = stop.Id, Order = s.Order });
            }

            await _routeStops.AddRangeAsync(rsEntities, ct);
            return await GetByIdAsync(route.Id, ct) ?? throw new InvalidOperationException("Route creation failed to load.");
        }

        /// <summary>
        /// Finds a route by operator identity (username or company name) and route code.
        /// Returns null if the operator or route is not found.
        /// </summary>
        public async Task<RouteResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var route = await _db.BusRoutes
                .Include(r => r.RouteStops).ThenInclude(rs => rs.Stop!)
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.OperatorId == operatorId && r.RouteCode == routeCode, ct);

            return route is null ? null : MapRoute(route);
        }

        /// <summary>
        /// Updates a route identified by operator identity and current route code.
        /// Can rename the route code and replace the entire stop list.
        /// Stops are looked up or auto-created by city+name.
        /// Returns null if the route is not found.
        /// </summary>
        public async Task<RouteResponseDto?> UpdateByKeysAsync(string operatorUsernameOrCompany, string routeCode, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var route = (await _routes.FindAsync(r => r.OperatorId == operatorId && r.RouteCode == routeCode, ct)).FirstOrDefault();
            if (route is null) return null;

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
                rsEntities.Add(new RouteStop { RouteId = route.Id, StopId = stop.Id, Order = s.Order });
            }
            await _routeStops.AddRangeAsync(rsEntities, ct);

            return await GetByIdAsync(route.Id, ct);
        }

        /// <summary>
        /// Deletes a route identified by operator identity and route code.
        /// Also deletes all associated route stops.
        /// Returns false if the route is not found.
        /// </summary>
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

        // ── Private helpers ───────────────────────────────────────────────────

        /// <summary>
        /// Validates that all stop city and name values are non-empty.
        /// Throws InvalidOperationException if any are blank.
        /// </summary>
        private static void ValidateStopNames(IEnumerable<(string City, string Name)> stops)
        {
            foreach (var (city, name) in stops)
            {
                if (string.IsNullOrWhiteSpace(city) || string.IsNullOrWhiteSpace(name))
                    throw new InvalidOperationException("Stop City and Name are required.");
            }
        }

        /// <summary>
        /// Validates that the stop list has at least 2 stops, that order values
        /// are continuous starting at 1 (no gaps), and that no stop or order is duplicated.
        /// Throws InvalidOperationException if any rule is violated.
        /// </summary>
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

            if (ordered.GroupBy(s => s.Order).Any(g => g.Count() > 1))
                throw new InvalidOperationException("Duplicate 'Order' values are not allowed.");

            if (ordered.GroupBy(s => s.StopId).Any(g => g.Count() > 1))
                throw new InvalidOperationException("A stop cannot appear more than once in a route for v1.");
        }

        /// <summary>
        /// Verifies that all provided stop GUIDs exist in the database.
        /// Throws InvalidOperationException listing any missing IDs if any are not found.
        /// </summary>
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

        /// <summary>
        /// Resolves an operator's GUID from either their username or company name.
        /// Tries username first; falls back to company name if username is blank.
        /// Throws InvalidOperationException if neither resolves to a valid operator.
        /// </summary>
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

        /// <summary>
        /// Looks up a stop by city and name. If it doesn't exist, creates and saves it.
        /// Used by key-based route creation so operators don't need to pre-create stops.
        /// </summary>
        private async Task<Stop> GetOrCreateStopAsync(string city, string name, CancellationToken ct)
        {
            city =
 city.Trim();
            name = name.Trim();

            var existing = await _db.Stops.FirstOrDefaultAsync(s => s.City == city && s.Name == name, ct);
            if (existing != null) return existing;

            var created = new Stop { City = city, Name = name };
            return await _stops.AddAsync(created, ct);
        }

        /// <summary>
        /// Maps a BusRoute entity to a RouteResponseDto.
        /// Stops are sorted by their Order value before mapping.
        /// </summary>
        private static RouteResponseDto MapRoute(BusRoute route) => new()
        {
            Id           = route.Id,
            OperatorId   = route.OperatorId,
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
