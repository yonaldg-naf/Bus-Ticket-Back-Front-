using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class ScheduleService : IScheduleService
    {
        private readonly IRepository<BusSchedule> _schedules;
        private readonly IRepository<Bus> _buses;
        private readonly IRepository<BusRoute> _routes;
        private readonly AppDbContext _db;

        public ScheduleService(
            IRepository<BusSchedule> schedules,
            IRepository<Bus> buses,
            IRepository<BusRoute> routes,
            AppDbContext db)
        {
            _schedules = schedules;
            _buses = buses;
            _routes = routes;
            _db = db;
        }

        // ========================= CREATE =========================
        public async Task<ScheduleResponseDto> CreateAsync(CreateScheduleRequestDto dto, CancellationToken ct = default)
        {
            var depUtc = EnsureUtc(dto.DepartureUtc);

            if (depUtc < DateTime.UtcNow.AddMinutes(-1))
                throw new InvalidOperationException("Departure time must be in the future.");

            var bus = await _buses.GetByIdAsync(dto.BusId, ct)
                ?? throw new InvalidOperationException("Bus not found.");

            var route = await _routes.GetByIdAsync(dto.RouteId, ct)
                ?? throw new InvalidOperationException("Route not found.");

            var dup = (await _schedules.FindAsync(
                s => s.BusId == dto.BusId && s.DepartureUtc == depUtc,
                ct)).Any();

            if (dup)
                throw new InvalidOperationException("A schedule for this bus at the specified time already exists.");

            var entity = new BusSchedule
            {
                BusId = dto.BusId,
                RouteId = dto.RouteId,
                DepartureUtc = depUtc,
                BasePrice = dto.BasePrice
            };

            entity = await _schedules.AddAsync(entity, ct);

            return Map(entity, bus, route);
        }

        // ========================= GET ALL =========================
        public async Task<IEnumerable<ScheduleResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var list = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .OrderBy(s => s.DepartureUtc)
                .ToListAsync(ct);

            return list.Select(e => Map(e, e.Bus!, e.Route!));
        }

        // ========================= GET ALL SECURED (operator-scoped) =========================
        public async Task<IEnumerable<ScheduleResponseDto>> GetAllSecuredAsync(Guid userId, string role, CancellationToken ct = default)
        {
            if (role == Roles.Admin)
                return await GetAllAsync(ct);  // Admin sees all

            // Operator: find their BusOperator profile, then filter by their buses
            var operatorProfile = await _db.BusOperators
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.UserId == userId, ct);

            if (operatorProfile == null)
                return Enumerable.Empty<ScheduleResponseDto>();

            var list = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .Where(s => s.Bus!.OperatorId == operatorProfile.Id)
                .OrderBy(s => s.DepartureUtc)
                .ToListAsync(ct);

            return list.Select(e => Map(e, e.Bus!, e.Route!));
        }

        // ========================= GET BY ID =========================
        public async Task<ScheduleResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var e = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            return e is null ? null : Map(e, e.Bus!, e.Route!);
        }

        // ========================= UPDATE =========================
        public async Task<ScheduleResponseDto?> UpdateAsync(Guid id, UpdateScheduleRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _schedules.GetByIdAsync(id, ct);
            if (entity is null) return null;

            var depUtc = EnsureUtc(dto.DepartureUtc);

            if (depUtc < DateTime.UtcNow.AddMinutes(-1))
                throw new InvalidOperationException("Departure time must be in the future.");

            var bus = await _buses.GetByIdAsync(dto.BusId, ct)
                ?? throw new InvalidOperationException("Bus not found.");

            var route = await _routes.GetByIdAsync(dto.RouteId, ct)
                ?? throw new InvalidOperationException("Route not found.");

            var dup = (await _schedules.FindAsync(
                s => s.Id != id && s.BusId == dto.BusId && s.DepartureUtc == depUtc,
                ct)).Any();

            if (dup)
                throw new InvalidOperationException("A schedule for this bus at the specified time already exists.");

            entity.BusId = dto.BusId;
            entity.RouteId = dto.RouteId;
            entity.DepartureUtc = depUtc;
            entity.BasePrice = dto.BasePrice;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            await _schedules.UpdateAsync(entity, ct);

            return Map(entity, bus, route);
        }

        // ========================= CANCEL (with reason) =========================
        public async Task<ScheduleResponseDto?> CancelAsync(Guid id, string reason, CancellationToken ct = default)
        {
            var sched = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (sched is null) return null;

            sched.IsCancelledByOperator = true;
            sched.CancelReason = reason;
            sched.UpdatedAtUtc = DateTime.UtcNow;

            // Cancel all active bookings for this schedule
            var bookings = await _db.Bookings
                .Where(b => b.ScheduleId == id && b.Status != BookingStatus.OperatorCancelled && b.Status != BookingStatus.Cancelled)
                .ToListAsync(ct);

            foreach (var b in bookings)
            {
                b.Status = BookingStatus.OperatorCancelled;
                b.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            return Map(sched, sched.Bus!, sched.Route!);
        }

        // ========================= DELETE (SOFT CANCEL) =========================
        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var sched = await _schedules.GetByIdAsync(id, ct);
            if (sched is null) return false;

            bool hasBookings = await _db.Bookings
                .AnyAsync(b => b.ScheduleId == id, ct);

            if (hasBookings)
            {
                sched.IsCancelledByOperator = true;
                sched.CancelReason = "Cancelled by operator";
                sched.UpdatedAtUtc = DateTime.UtcNow;

                await _schedules.UpdateAsync(sched, ct);

                var bookings = await _db.Bookings
                    .Where(b => b.ScheduleId == id)
                    .ToListAsync(ct);

                foreach (var b in bookings)
                {
                    if (b.Status != BookingStatus.OperatorCancelled)
                    {
                        b.Status = BookingStatus.OperatorCancelled;
                        b.UpdatedAtUtc = DateTime.UtcNow;
                    }
                }

                await _db.SaveChangesAsync(ct);
                return true;
            }

            await _schedules.RemoveAsync(sched, ct);
            return true;
        }

        // ========================= SEARCH =========================
        public async Task<PagedResult<ScheduleResponseDto>> SearchAsync(
            Guid fromStopId,
            Guid toStopId,
            DateOnly date,
            PagedRequestDto request,
            CancellationToken ct = default)
        {
            var baseQuery = _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)!.ThenInclude(r => r.RouteStops)
                .AsNoTracking()
                .Where(s => DateOnly.FromDateTime(s.DepartureUtc) == date);

            var list = await baseQuery.ToListAsync(ct);

            var filtered = list.Where(s =>
            {
                var stops = s.Route!.RouteStops.OrderBy(rs => rs.Order).ToList();
                var fromIdx = stops.FindIndex(rs => rs.StopId == fromStopId);
                var toIdx = stops.FindIndex(rs => rs.StopId == toStopId);

                return fromIdx >= 0 && toIdx >= 0 && fromIdx < toIdx;
            })
            .Select(s => Map(s, s.Bus!, s.Route!));

            var sortBy = (request.SortBy ?? "departure").Trim().ToLowerInvariant();
            var desc = request.IsDescending();

            filtered = sortBy switch
            {
                "price" => (desc ? filtered.OrderByDescending(x => x.BasePrice) : filtered.OrderBy(x => x.BasePrice)),
                "buscode" => (desc ? filtered.OrderByDescending(x => x.BusCode) : filtered.OrderBy(x => x.BusCode)),
                "routecode" => (desc ? filtered.OrderByDescending(x => x.RouteCode) : filtered.OrderBy(x => x.RouteCode)),
                _ => (desc ? filtered.OrderByDescending(x => x.DepartureUtc) : filtered.OrderBy(x => x.DepartureUtc)),
            };

            var total = filtered.LongCount();
            var (skip, take) = request.GetSkipTake();

            var pageItems = filtered.Skip(skip).Take(take).ToList();

            return new PagedResult<ScheduleResponseDto>
            {
                Page = request.Page,
                PageSize = request.PageSize,
                TotalCount = total,
                Items = pageItems
            };
        }

        // ========================= AVAILABILITY =========================
        public async Task<SeatAvailabilityResponseDto> GetAvailabilityAsync(Guid scheduleId, CancellationToken ct = default)
        {
            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == scheduleId, ct)
                ?? throw new InvalidOperationException("Schedule not found.");

            var totalSeats = schedule.Bus?.TotalSeats ?? 40;

            var allSeats = Enumerable.Range(1, totalSeats).Select(i => i.ToString()).ToList();

            var bookedSeats = await _db.Bookings
                .Where(b => b.ScheduleId == scheduleId && b.Status != BookingStatus.Cancelled)
                .SelectMany(b => b.Passengers.Select(p => p.SeatNo))
                .ToListAsync(ct);

            var bookedSet = new HashSet<string>(bookedSeats, StringComparer.OrdinalIgnoreCase);

            var availableSeats = allSeats.Where(s => !bookedSet.Contains(s)).ToList();

            return new SeatAvailabilityResponseDto
            {
                ScheduleId = scheduleId,
                BusCode = schedule.Bus?.Code ?? string.Empty,
                TotalSeats = totalSeats,
                BookedCount = bookedSet.Count,
                AvailableCount = availableSeats.Count,
                BookedSeats = bookedSet.OrderBy(x => int.TryParse(x, out int n) ? n : int.MaxValue).ToList(),
                AvailableSeats = availableSeats
            };
        }

        // ========================= CREATE BY KEYS =========================
        public async Task<ScheduleResponseDto> CreateByKeysAsync(CreateScheduleByKeysRequestDto dto, CancellationToken ct = default)
        {
            var operatorId = await ResolveOperatorIdAsync(dto.OperatorUsername, dto.CompanyName, ct);

            var bus = await _db.Buses.AsNoTracking()
                .FirstOrDefaultAsync(b => b.OperatorId == operatorId && b.Code == dto.BusCode, ct)
                ?? throw new InvalidOperationException("Bus not found for operator.");

            var route = await _db.BusRoutes.AsNoTracking()
                .FirstOrDefaultAsync(r => r.OperatorId == operatorId && r.RouteCode == dto.RouteCode, ct)
                ?? throw new InvalidOperationException("Route not found for operator.");

            DateTime depUtc = dto.DepartureUtc.HasValue
                ? EnsureUtc(dto.DepartureUtc.Value)
                : ConvertToUtc(dto.DepartureLocal!.Value, dto.TimeZoneId!);

            if (depUtc < DateTime.UtcNow.AddMinutes(-1))
                throw new InvalidOperationException("Departure time must be in the future.");

            var dup = (await _schedules.FindAsync(
                s => s.BusId == bus.Id && s.DepartureUtc == depUtc,
                ct)).Any();

            if (dup)
                throw new InvalidOperationException("A schedule for this bus at the specified time already exists.");

            var entity = new BusSchedule
            {
                BusId = bus.Id,
                RouteId = route.Id,
                DepartureUtc = depUtc,
                BasePrice = dto.BasePrice
            };

            entity = await _schedules.AddAsync(entity, ct);

            return Map(entity, bus, route);
        }

        // ========================= SEARCH BY KEYS =========================
        public async Task<PagedResult<ScheduleResponseDto>> SearchByKeysAsync(SearchSchedulesByKeysRequestDto dto, CancellationToken ct = default)
        {
            var fromStopIds = await _db.Stops.AsNoTracking()
                .Where(s => s.City == dto.FromCity &&
                          (dto.FromStopName == null || s.Name == dto.FromStopName))
                .Select(s => s.Id)
                .ToListAsync(ct);

            var toStopIds = await _db.Stops.AsNoTracking()
                .Where(s => s.City == dto.ToCity &&
                          (dto.ToStopName == null || s.Name == dto.ToStopName))
                .Select(s => s.Id)
                .ToListAsync(ct);

            if (!fromStopIds.Any() || !toStopIds.Any())
            {
                return new PagedResult<ScheduleResponseDto>
                {
                    Page = dto.Page,
                    PageSize = dto.PageSize,
                    TotalCount = 0,
                    Items = Array.Empty<ScheduleResponseDto>()
                };
            }

            var baseQuery = _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)!.ThenInclude(r => r.RouteStops)
                .AsNoTracking()
                .Where(s => DateOnly.FromDateTime(s.DepartureUtc) == dto.Date);

            var list = await baseQuery.ToListAsync(ct);

            var filtered = list.Where(s =>
            {
                var stops = s.Route!.RouteStops.OrderBy(rs => rs.Order).ToList();
                int fromIdx = stops.FindIndex(rs => fromStopIds.Contains(rs.StopId));
                int toIdx = stops.FindIndex(rs => toStopIds.Contains(rs.StopId));

                return fromIdx >= 0 && toIdx >= 0 && fromIdx < toIdx;
            })
            .Select(s => Map(s, s.Bus!, s.Route!));

            // Apply optional filters
            if (dto.BusType.HasValue)
                filtered = filtered.Where(x => x.BusType == dto.BusType.Value);
            if (dto.MinPrice.HasValue)
                filtered = filtered.Where(x => x.BasePrice >= dto.MinPrice.Value);
            if (dto.MaxPrice.HasValue)
                filtered = filtered.Where(x => x.BasePrice <= dto.MaxPrice.Value);

            var sortBy = (dto.SortBy ?? "departure").Trim().ToLowerInvariant();
            bool desc = dto.SortDir?.ToLower() == "desc";

            filtered = sortBy switch
            {
                "price" => (desc ? filtered.OrderByDescending(x => x.BasePrice) : filtered.OrderBy(x => x.BasePrice)),
                "buscode" => (desc ? filtered.OrderByDescending(x => x.BusCode) : filtered.OrderBy(x => x.BusCode)),
                "routecode" => (desc ? filtered.OrderByDescending(x => x.RouteCode) : filtered.OrderBy(x => x.RouteCode)),
                _ => (desc ? filtered.OrderByDescending(x => x.DepartureUtc) : filtered.OrderBy(x => x.DepartureUtc)),
            };

            long total = filtered.LongCount();
            int skip = Math.Max(0, (dto.Page - 1) * dto.PageSize);
            int take = Math.Max(1, dto.PageSize);

            var items = filtered.Skip(skip).Take(take).ToList();

            return new PagedResult<ScheduleResponseDto>
            {
                Page = dto.Page,
                PageSize = dto.PageSize,
                TotalCount = total,
                Items = items
            };
        }

        // ========================= DELETE BY KEYS =========================
        public async Task<bool> DeleteByKeysAsync(string busCode, DateTime departureUtc, CancellationToken ct = default)
        {
            var sched = (await _schedules.FindAsync(
                s => s.DepartureUtc == EnsureUtc(departureUtc) &&
                     s.Bus!.Code == busCode,
                ct)).FirstOrDefault();

            if (sched is null) return false;

            bool hasBookings = await _db.Bookings
                .AnyAsync(b => b.ScheduleId == sched.Id, ct);

            if (hasBookings)
            {
                sched.IsCancelledByOperator = true;
                sched.CancelReason = "Cancelled by operator";
                sched.UpdatedAtUtc = DateTime.UtcNow;

                await _schedules.UpdateAsync(sched, ct);

                var bookings = await _db.Bookings
                    .Where(b => b.ScheduleId == sched.Id)
                    .ToListAsync(ct);

                foreach (var b in bookings)
                {
                    if (b.Status != BookingStatus.OperatorCancelled)
                    {
                        b.Status = BookingStatus.OperatorCancelled;
                        b.UpdatedAtUtc = DateTime.UtcNow;
                    }
                }

                await _db.SaveChangesAsync(ct);
                return true;
            }

            await _schedules.RemoveAsync(sched, ct);
            return true;
        }

        // ========================= HELPERS =========================
        private async Task<Guid> ResolveOperatorIdAsync(string? username, string? companyName, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(username))
            {
                var user = await _db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Username == username, ct)
                    ?? throw new InvalidOperationException("Operator user not found.");

                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == user.Id, ct)
                    ?? throw new InvalidOperationException("Operator profile not found.");

                return op.Id;
            }

            if (!string.IsNullOrWhiteSpace(companyName))
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.CompanyName == companyName, ct)
                    ?? throw new InvalidOperationException("Operator with given company name not found.");

                return op.Id;
            }

            throw new InvalidOperationException("Provide OperatorUsername or CompanyName.");
        }

        private static DateTime EnsureUtc(DateTime dt) =>
            dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Local).ToUniversalTime()
            };

        private static DateTime ConvertToUtc(DateTime local, string timeZoneId)
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);

            if (local.Kind == DateTimeKind.Utc)
                return local;

            var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(unspecified, tz);
        }

        private static ScheduleResponseDto Map(BusSchedule e, Bus bus, BusRoute route) =>
            new ScheduleResponseDto
            {
                Id = e.Id,
                BusId = e.BusId,
                RouteId = e.RouteId,
                BusCode = bus.Code,
                RegistrationNumber = bus.RegistrationNumber,
                RouteCode = route.RouteCode,
                BusType = (int)bus.BusType,
                TotalSeats = bus.TotalSeats,
                DepartureUtc = e.DepartureUtc,
                BasePrice = e.BasePrice,
                CreatedAtUtc = e.CreatedAtUtc,
                UpdatedAtUtc = e.UpdatedAtUtc,
                IsCancelledByOperator = e.IsCancelledByOperator,
                CancelReason = e.CancelReason
            };

        public async Task<SeatAvailabilityResponseDto> GetAvailabilityByKeysAsync(string busCode, DateTime departureUtc, CancellationToken ct = default)
        {
            var depUtc = EnsureUtc(departureUtc);
            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.Bus!.Code == busCode &&
                    s.DepartureUtc >= depUtc.AddSeconds(-30) &&
                    s.DepartureUtc <= depUtc.AddSeconds(30),
                    ct)
                ?? throw new InvalidOperationException("Schedule not found for given busCode and departure time.");

            return await GetAvailabilityAsync(schedule.Id, ct);
        }

        public async Task<ScheduleResponseDto?> GetByBusCodeAndDepartureAsync(string busCode, DateTime departureUtc, CancellationToken ct = default)
        {
            var depUtc = EnsureUtc(departureUtc);
            var e = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s =>
                    s.Bus!.Code == busCode &&
                    s.DepartureUtc >= depUtc.AddSeconds(-30) &&
                    s.DepartureUtc <= depUtc.AddSeconds(30),
                    ct);

            return e is null ? null : Map(e, e.Bus!, e.Route!);
        }
    }
}