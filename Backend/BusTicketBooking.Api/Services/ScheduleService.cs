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
    /// <summary>
    /// Manages bus schedules — the specific departure times when a bus runs a route.
    /// Handles creation, search, seat availability, cancellation, and deletion.
    ///
    /// Key behaviours:
    ///   - All departure times are stored and compared in UTC.
    ///   - Search filters out departed and operator-cancelled schedules automatically.
    ///   - Cancelling a schedule issues full wallet refunds to all confirmed bookings.
    ///   - Supports both GUID-based and key-based (busCode + routeCode) operations.
    /// </summary>
    public class ScheduleService : IScheduleService
    {
        private readonly IRepository<BusSchedule> _schedules;
        private readonly IRepository<Bus> _buses;
        private readonly IRepository<BusRoute> _routes;
        private readonly AppDbContext _db;
        private readonly IWalletService _wallet;

        public ScheduleService(
            IRepository<BusSchedule> schedules,
            IRepository<Bus> buses,
            IRepository<BusRoute> routes,
            AppDbContext db,
            IWalletService wallet)
        {
            _schedules = schedules;
            _buses = buses;
            _routes = routes;
            _db = db;
            _wallet = wallet;
        }

        // ── CRUD methods ──────────────────────────────────────────────────────

        /// <summary>
        /// Creates a new schedule using bus and route GUIDs.
        /// Validates that the departure time is in the future and that no duplicate
        /// schedule exists for the same bus at the same time.
        /// Throws InvalidOperationException if the bus or route is not found,
        /// the departure is in the past, or a duplicate schedule exists.
        /// </summary>
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

        /// <summary>
        /// Returns all schedules in the system ordered by departure time (earliest first).
        /// Includes bus and route details. No filtering applied — admin use only.
        /// </summary>
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

        /// <summary>
        /// Returns a single schedule by its ID with bus and route details.
        /// Returns null if not found.
        /// </summary>
        public async Task<ScheduleResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var e = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            return e is null ? null : Map(e, e.Bus!, e.Route!);
        }

        /// <summary>
        /// Updates a schedule's departure time and base price.
        /// The new departure time is converted from local time + timezone ID to UTC.
        /// Validates that the new time is in the future and not a duplicate for the same bus.
        /// Returns null if the schedule does not exist.
        /// </summary>
        public async Task<ScheduleResponseDto?> UpdateAsync(Guid id, UpdateScheduleRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .FirstOrDefaultAsync(s => s.Id == id, ct);

            if (entity is null) return null;

            var depUtc = ConvertToUtc(
                DateTime.SpecifyKind(
                    DateTime.Parse(dto.DepartureLocal, System.Globalization.CultureInfo.InvariantCulture),
                    DateTimeKind.Unspecified),
                dto.TimeZoneId);

            if (depUtc < DateTime.UtcNow.AddMinutes(-1))
                throw new InvalidOperationException("Departure time must be in the future.");

            var dup = await _db.BusSchedules.AnyAsync(
                s => s.Id != id && s.BusId == entity.BusId && s.DepartureUtc == depUtc, ct);

            if (dup)
                throw new InvalidOperationException("A schedule for this bus at the specified time already exists.");

            entity.DepartureUtc = depUtc;
            entity.BasePrice = dto.BasePrice;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return Map(entity, entity.Bus!, entity.Route!);
        }

        /// <summary>
        /// Cancels a schedule with a reason and issues full wallet refunds to all
        /// confirmed bookings on that schedule.
        ///
        /// Steps:
        ///   1. Marks the schedule as IsCancelledByOperator = true with the given reason.
        ///   2. Finds all active bookings (not already cancelled).
        ///   3. Sets each booking's status to OperatorCancelled.
        ///   4. For each booking that was paid (PaymentStatus.Success), credits the full
        ///      booking amount back to the customer's wallet.
        ///
        /// Returns null if the schedule does not exist.
        /// </summary>
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

            // Cancel all active bookings and issue full refunds to wallets
            var bookings = await _db.Bookings
                .Include(b => b.Payment)
                .Where(b => b.ScheduleId == id
                         && b.Status != BookingStatus.OperatorCancelled
                         && b.Status != BookingStatus.Cancelled)
                .ToListAsync(ct);

            foreach (var b in bookings)
            {
                b.Status = BookingStatus.OperatorCancelled;
                b.UpdatedAtUtc = DateTime.UtcNow;

                // Full refund for confirmed paid bookings
                if (b.Payment?.Status == PaymentStatus.Success)
                {
                    await _wallet.CreditAsync(
                        b.UserId, b.TotalAmount, "OperatorCancelRefund",
                        bookingId: b.Id,
                        description: $"Full refund — operator cancelled schedule #{id.ToString()[..8].ToUpper()}",
                        ct: ct);
                }
            }

            await _db.SaveChangesAsync(ct);
            return Map(sched, sched.Bus!, sched.Route!);
        }

        /// <summary>
        /// Deletes a schedule. Behaviour depends on whether bookings exist:
        ///   - No bookings → permanently deletes the schedule record.
        ///   - Has bookings → soft-deletes by marking IsCancelledByOperator = true
        ///                    and setting all non-cancelled bookings to OperatorCancelled.
        ///                    The schedule record is kept for historical reference.
        /// Returns false if the schedule does not exist.
        /// </summary>
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

        /// <summary>
        /// Returns the seat availability for a schedule — which seats are booked and which are free.
        /// Cancelled, OperatorCancelled, and BusMissed bookings do NOT count as booked
        /// (those seats are freed back to available).
        /// Throws InvalidOperationException if the schedule does not exist.
        /// </summary>
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
                .Where(b => b.ScheduleId == scheduleId
                         && b.Status != BookingStatus.Cancelled
                         && b.Status != BookingStatus.OperatorCancelled
                         && b.Status != BookingStatus.BusMissed)
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

        /// <summary>
        /// Searches for schedules using city/stop names instead of GUIDs.
        /// Supports additional filters: bus type, price range, amenities.
        /// Applies the same departure/cancellation filters as SearchAsync.
        /// Returns an empty result if no stops are found for the given city names.
        /// </summary>
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

            // Convert the customer's local date to a UTC window using their timezone offset.
            // e.g. IST (UTC+330): "2026-03-26" local = 2026-03-25T18:30Z to 2026-03-26T18:29:59Z
            var offsetSpan  = TimeSpan.FromMinutes(dto.UtcOffsetMinutes);
            var dayStartUtc = dto.Date.ToDateTime(TimeOnly.MinValue) - offsetSpan;
            var dayEndUtc   = dayStartUtc.AddDays(1);
            var now         = DateTime.UtcNow;

            var baseQuery = _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)!.ThenInclude(r => r.RouteStops)
                .AsNoTracking()
                .Where(s => s.DepartureUtc >= dayStartUtc
                         && s.DepartureUtc < dayEndUtc
                         && s.DepartureUtc > now               // exclude departed
                         && !s.IsCancelledByOperator);          // exclude cancelled

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
            if (dto.Amenities != null && dto.Amenities.Count > 0)
            {
                var required = dto.Amenities
                    .Select(a => a.Trim().ToLowerInvariant())
                    .Where(a => a.Length > 0)
                    .ToList();

                filtered = filtered.Where(x =>
                    required.All(req =>
                        x.Amenities.Any(a => a.ToLowerInvariant() == req)));
            }

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

        // ── Private helpers ───────────────────────────────────────────────────

        /// <summary>
        /// Ensures a DateTime value is in UTC.
        /// - Already UTC → returned as-is.
        /// - Local kind  → converted to UTC.
        /// - Unspecified → treated as UTC directly (all API fields named "...Utc" are expected to be UTC).
        /// </summary>
        private static DateTime EnsureUtc(DateTime dt) =>
            dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                // Unspecified kind — the field is named DepartureUtc so treat it as UTC directly
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };

        /// <summary>
        /// Converts a local DateTime to UTC using the given IANA or Windows timezone ID.
        /// Throws if the timezone ID is not recognized by the system.
        /// </summary>
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
                CancelReason = e.CancelReason,
                Amenities = string.IsNullOrWhiteSpace(bus.Amenities)
                    ? new List<string>()
                    : bus.Amenities.Split(',', System.StringSplitOptions.RemoveEmptyEntries)
                                   .Select(a => a.Trim())
                                   .Where(a => a.Length > 0)
                                   .ToList()
            };

    }
}