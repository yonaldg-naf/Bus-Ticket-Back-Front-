using System;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bookings;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class BookingService : IBookingService
    {
        private readonly IRepository<Booking> _bookings;
        private readonly IRepository<BookingPassenger> _passengers;
        private readonly IRepository<Payment> _payments;
        private readonly IRepository<BusSchedule> _schedules;
        private readonly AppDbContext _db;

        public BookingService(
            IRepository<Booking> bookings,
            IRepository<BookingPassenger> passengers,
            IRepository<Payment> payments,
            IRepository<BusSchedule> schedules,
            AppDbContext db)
        {
            _bookings = bookings;
            _passengers = passengers;
            _payments = payments;
            _schedules = schedules;
            _db = db;
        }

        // ===========================
        // CREATE (ID BASED)
        // ===========================
        public async Task<BookingResponseDto> CreateAsync(Guid userId, CreateBookingRequestDto dto, CancellationToken ct = default)
        {
            if (dto.Passengers.Count == 0)
                throw new InvalidOperationException("At least one passenger is required.");

            var seatSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var p in dto.Passengers)
            {
                var seat = (p.SeatNo ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(seat))
                    throw new InvalidOperationException("Seat number is required.");

                if (!seatSet.Add(seat))
                    throw new InvalidOperationException($"Duplicate seat in request: {seat}");
            }

            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == dto.ScheduleId, ct)
                ?? throw new InvalidOperationException("Schedule not found.");

            if (schedule.IsCancelledByOperator)
                throw new InvalidOperationException("This schedule was cancelled by the operator.");

            if (schedule.DepartureUtc <= DateTime.UtcNow)
                throw new InvalidOperationException("This schedule has already departed. Booking is no longer available.");

            var busStatus = schedule.Bus?.Status ?? BusStatus.NotAvailable;
            if (busStatus != BusStatus.Available)
            {
                var reason = busStatus == BusStatus.UnderRepair ? "Bus is under repair." : "Bus is not available.";
                throw new InvalidOperationException(reason);
            }
            var totalSeats = schedule.Bus?.TotalSeats ?? 0;
            if (totalSeats <= 0) totalSeats = 40;

            var allowedSeats = GenerateNumericSeats(totalSeats);
            var allowedSet = new HashSet<string>(allowedSeats, StringComparer.OrdinalIgnoreCase);

            var invalid = dto.Passengers
                .Select(p => p.SeatNo.Trim())
                .Where(s => !allowedSet.Contains(s))
                .ToList();

            if (invalid.Any())
                throw new InvalidOperationException($"Invalid seat(s) for this bus: {string.Join(", ", invalid)}");

            var total = schedule.BasePrice * dto.Passengers.Count;

            // Promo + seat check + booking creation all inside one serializable transaction
            decimal discount = 0;
            string? appliedPromoCode = null;
            var finalAmount = total;

            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            // Apply promo inside transaction so UsedCount increment is atomic with booking
            if (!string.IsNullOrWhiteSpace(dto.PromoCode))
            {
                var promo = await _db.PromoCodes
                    .FirstOrDefaultAsync(p => p.Code == dto.PromoCode.ToUpper().Trim() && p.IsActive, ct);

                if (promo != null
                    && promo.ExpiresAtUtc >= DateTime.UtcNow
                    && promo.UsedCount < promo.MaxUses
                    && (!promo.MinBookingAmount.HasValue || total >= promo.MinBookingAmount.Value))
                {
                    discount = promo.DiscountType == 2
                        ? Math.Round(total * promo.DiscountValue / 100, 2)
                        : promo.DiscountValue;

                    if (promo.MaxDiscountAmount.HasValue && discount > promo.MaxDiscountAmount.Value)
                        discount = promo.MaxDiscountAmount.Value;

                    discount = Math.Min(discount, total);
                    appliedPromoCode = promo.Code;
                    promo.UsedCount++;
                }
            }

            finalAmount = total - discount;

            var requestedSeats = dto.Passengers.Select(p => p.SeatNo.Trim()).ToList();

            var takenSeats = await _db.BookingPassengers
                .Where(bp => requestedSeats.Contains(bp.SeatNo))
                .Join(_db.Bookings,
                      bp => bp.BookingId,
                      b => b.Id,
                      (bp, b) => new { bp.SeatNo, b.ScheduleId, b.Status })
                .Where(x => x.ScheduleId == dto.ScheduleId && x.Status != BookingStatus.Cancelled)
                .Select(x => x.SeatNo)
                .ToListAsync(ct);

            if (takenSeats.Any())
                throw new InvalidOperationException($"One or more seats are already taken: {string.Join(", ", takenSeats)}");

            var entity = new Booking
            {
                UserId = userId,
                ScheduleId = dto.ScheduleId,
                Status = BookingStatus.Pending,
                TotalAmount = finalAmount,
                PromoCode = appliedPromoCode,
                DiscountAmount = discount
            };

            await _bookings.AddAsync(entity, ct);

            var passengerEntities = dto.Passengers
                .Select(p => new BookingPassenger
                {
                    BookingId = entity.Id,
                    Name = p.Name.Trim(),
                    Age = p.Age,
                    SeatNo = p.SeatNo.Trim()
                })
                .ToList();

            await _passengers.AddRangeAsync(passengerEntities, ct);

            var payment = new Payment
            {
                BookingId = entity.Id,
                Amount = finalAmount,
                Status = PaymentStatus.Initiated,
                ProviderReference = "INIT"
            };

            await _payments.AddAsync(payment, ct);

            await tx.CommitAsync(ct);

            return await LoadForResponse(entity.Id, ct)
                ?? throw new InvalidOperationException("Booking created but failed to load.");
        }

        // ===========================
        // GET MY BOOKINGS
        // ===========================
        public async Task<IEnumerable<BookingResponseDto>> GetMyAsync(Guid userId, CancellationToken ct = default)
        {
            var data = await _db.Bookings
                .Include(b => b.Passengers)
                .Include(b => b.Payment)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Bus)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Route)
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAtUtc)
                .ToListAsync(ct);

            return data.Select(Map);
        }

        // ===========================
        // GET BOOKING BY ID (USER)
        // ===========================
        public async Task<BookingResponseDto?> GetByIdForUserAsync(Guid userId, Guid bookingId, bool allowPrivileged = false, CancellationToken ct = default)
        {
            var e = await _db.Bookings
                .Include(b => b.Passengers)
                .Include(b => b.Payment)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Bus)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

            if (e is null) return null;
            if (!allowPrivileged && e.UserId != userId) return null;

            return Map(e);
        }

        // ===========================
        // CANCEL BOOKING
        // ===========================
        public async Task<bool> CancelAsync(Guid userId, Guid bookingId, bool allowPrivileged = false, CancellationToken ct = default)
        {
            var booking = await _bookings.GetByIdAsync(bookingId, ct);
            if (booking is null) return false;

            if (!allowPrivileged && booking.UserId != userId)
                throw new UnauthorizedAccessException("You cannot cancel a booking you don't own.");

            if (booking.Status == BookingStatus.Cancelled) return true;

            booking.Status = BookingStatus.Cancelled;
            booking.UpdatedAtUtc = DateTime.UtcNow;

            await _bookings.UpdateAsync(booking, ct);
            return true;
        }

        // ===========================
        // PAY BOOKING
        // ===========================
        public async Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool allowPrivileged = false, CancellationToken ct = default)
        {
            var booking = await _db.Bookings
                .Include(b => b.Payment)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Bus)
                .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

            if (booking is null) return null;
            if (!allowPrivileged && booking.UserId != userId) return null;

            if (booking.Status == BookingStatus.Cancelled ||
                booking.Status == BookingStatus.OperatorCancelled)
                throw new InvalidOperationException("Cannot pay a cancelled booking.");

            booking.Payment ??= new Payment
            {
                BookingId = booking.Id,
                Amount = booking.TotalAmount
            };

            booking.Payment.Amount = amount <= 0 ? booking.TotalAmount : amount;
            booking.Payment.Status = PaymentStatus.Success;
            booking.Payment.ProviderReference = string.IsNullOrWhiteSpace(providerRef)
                ? "MOCK-PAYMENT"
                : providerRef.Trim();

            booking.Status = BookingStatus.Confirmed;
            booking.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await LoadForResponse(bookingId, ct);
        }

        // ===========================
        // CREATE (BY KEYS)
        // ===========================
        public async Task<BookingResponseDto> CreateByKeysAsync(Guid userId, CreateBookingByKeysRequestDto dto, CancellationToken ct = default)
        {
            if (dto.Passengers.Count == 0)
                throw new InvalidOperationException("At least one passenger is required.");

            var seatSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var p in dto.Passengers)
            {
                var seat = (p.SeatNo ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(seat))
                    throw new InvalidOperationException("Seat number is required.");
                if (!seatSet.Add(seat))
                    throw new InvalidOperationException($"Duplicate seat in request: {seat}");
            }

            var depUtc = EnsureUtc(dto.DepartureUtc);

            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    s => s.Bus!.Code == dto.BusCode &&
                         s.DepartureUtc >= depUtc.AddSeconds(-30) &&
                         s.DepartureUtc <= depUtc.AddSeconds(30),
                    ct)
                ?? throw new InvalidOperationException("Schedule not found for given busCode & departureUtc.");

            if (schedule.IsCancelledByOperator)
                throw new InvalidOperationException("This schedule was cancelled by the operator.");

            if (schedule.DepartureUtc <= DateTime.UtcNow)
                throw new InvalidOperationException("This schedule has already departed. Booking is no longer available.");

            var busStatus = schedule.Bus?.Status ?? BusStatus.NotAvailable;
            if (busStatus != BusStatus.Available)
            {
                var reason = busStatus == BusStatus.UnderRepair ? "Bus is under repair." : "Bus is not available.";
                throw new InvalidOperationException(reason);
            }

            var totalSeats = schedule.Bus?.TotalSeats ?? 0;
            if (totalSeats <= 0) totalSeats = 40;

            var allowedSeats = GenerateNumericSeats(totalSeats);
            var allowedSet = new HashSet<string>(allowedSeats, StringComparer.OrdinalIgnoreCase);
            var invalid = dto.Passengers
                .Select(p => p.SeatNo.Trim())
                .Where(s => !allowedSet.Contains(s))
                .ToList();

            if (invalid.Any())
                throw new InvalidOperationException($"Invalid seat(s) for this bus: {string.Join(", ", invalid)}");

            var total = schedule.BasePrice * dto.Passengers.Count;

            // Promo + seat check + booking creation all inside one serializable transaction
            decimal discount = 0;
            string? appliedPromoCode = null;
            var finalAmount = total;

            await using var tx = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            // Apply promo inside transaction so UsedCount increment is atomic with booking
            if (!string.IsNullOrWhiteSpace(dto.PromoCode))
            {
                var promo = await _db.PromoCodes
                    .FirstOrDefaultAsync(p => p.Code == dto.PromoCode.ToUpper().Trim() && p.IsActive, ct);

                if (promo != null
                    && promo.ExpiresAtUtc >= DateTime.UtcNow
                    && promo.UsedCount < promo.MaxUses
                    && (!promo.MinBookingAmount.HasValue || total >= promo.MinBookingAmount.Value))
                {
                    discount = promo.DiscountType == 2
                        ? Math.Round(total * promo.DiscountValue / 100, 2)
                        : promo.DiscountValue;

                    if (promo.MaxDiscountAmount.HasValue && discount > promo.MaxDiscountAmount.Value)
                        discount = promo.MaxDiscountAmount.Value;

                    discount = Math.Min(discount, total);
                    appliedPromoCode = promo.Code;
                    promo.UsedCount++;
                }
            }

            finalAmount = total - discount;

            var requestedSeats = dto.Passengers.Select(p => p.SeatNo.Trim()).ToList();

            var takenSeats = await _db.BookingPassengers
                .Where(bp => requestedSeats.Contains(bp.SeatNo))
                .Join(_db.Bookings,
                      bp => bp.BookingId,
                      b => b.Id,
                      (bp, b) => new { bp.SeatNo, b.ScheduleId, b.Status })
                .Where(x => x.ScheduleId == schedule.Id && x.Status != BookingStatus.Cancelled)
                .Select(x => x.SeatNo)
                .ToListAsync(ct);

            if (takenSeats.Any())
                throw new InvalidOperationException($"One or more seats are already taken: {string.Join(", ", takenSeats)}");

            var entity = new Booking
            {
                UserId = userId,
                ScheduleId = schedule.Id,
                Status = BookingStatus.Pending,
                TotalAmount = finalAmount,
                PromoCode = appliedPromoCode,
                DiscountAmount = discount
            };

            await _bookings.AddAsync(entity, ct);

            var passengerEntities = dto.Passengers
                .Select(p => new BookingPassenger
                {
                    BookingId = entity.Id,
                    Name = p.Name.Trim(),
                    Age = p.Age,
                    SeatNo = p.SeatNo.Trim()
                })
                .ToList();

            await _passengers.AddRangeAsync(passengerEntities, ct);

            var payment = new Payment
            {
                BookingId = entity.Id,
                Amount = finalAmount,
                Status = PaymentStatus.Initiated,
                ProviderReference = "INIT"
            };

            await _payments.AddAsync(payment, ct);

            await tx.CommitAsync(ct);

            return await LoadForResponse(entity.Id, ct)
                ?? throw new InvalidOperationException("Booking created but failed to load.");
        }

        // ===========================
        // LOAD DTO FOR RESPONSE
        // ===========================
        private async Task<BookingResponseDto?> LoadForResponse(Guid bookingId, CancellationToken ct)
        {
            var e = await _db.Bookings
                .Include(b => b.Passengers)
                .Include(b => b.Payment)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Bus)
                .Include(b => b.Schedule)!.ThenInclude(s => s!.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

            return e is null ? null : Map(e);
        }

        // ===========================
        // 🔥 UPDATED MAPPER (IMPORTANT)
        // ===========================
        private static BookingResponseDto Map(Booking e)
        {
            var dto = new BookingResponseDto
            {
                Id = e.Id,
                UserId = e.UserId,
                ScheduleId = e.ScheduleId,
                Status = e.Status,
                TotalAmount = e.TotalAmount,
                PromoCode = e.PromoCode,
                DiscountAmount = e.DiscountAmount,
                CreatedAtUtc = e.CreatedAtUtc,
                UpdatedAtUtc = e.UpdatedAtUtc,

                BusCode = e.Schedule?.Bus?.Code ?? string.Empty,
                RegistrationNumber = e.Schedule?.Bus?.RegistrationNumber ?? string.Empty,
                RouteCode = e.Schedule?.Route?.RouteCode ?? string.Empty,
                DepartureUtc = e.Schedule?.DepartureUtc ?? default,

                BusStatus = e.Schedule?.Bus?.Status ?? BusStatus.Available,

                IsScheduleCancelledByOperator = e.Schedule?.IsCancelledByOperator ?? false,
                ScheduleCancelReason = e.Schedule?.CancelReason,

                Passengers = e.Passengers
                    .Select(p => new BookingPassengerDto
                    {
                        Name = p.Name,
                        Age = p.Age,
                        SeatNo = p.SeatNo
                    })
                    .ToList()
            };

            // Refund policy: calculate based on hours before departure
            if (e.Schedule != null && e.Status == BookingStatus.Confirmed)
            {
                var hoursUntilDeparture = (e.Schedule.DepartureUtc - DateTime.UtcNow).TotalHours;
                int refundPct;
                string policy;

                if (hoursUntilDeparture >= 48) { refundPct = 100; policy = "Full refund (48h+ before departure)"; }
                else if (hoursUntilDeparture >= 24) { refundPct = 75; policy = "75% refund (24–48h before departure)"; }
                else if (hoursUntilDeparture >= 6) { refundPct = 50; policy = "50% refund (6–24h before departure)"; }
                else if (hoursUntilDeparture >= 0) { refundPct = 25; policy = "25% refund (0–6h before departure)"; }
                else { refundPct = 0; policy = "No refund (trip already departed)"; }

                dto.RefundPercent = refundPct;
                dto.RefundAmount = Math.Round(e.TotalAmount * refundPct / 100, 2);
                dto.RefundPolicy = policy;
            }

            return dto;
        }

        // ===========================
        // HELPERS
        // ===========================
        private static List<string> GenerateNumericSeats(int totalSeats)
            => Enumerable.Range(1, totalSeats).Select(i => i.ToString()).ToList();

        private static DateTime EnsureUtc(DateTime dt) =>
            dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };
    }
}