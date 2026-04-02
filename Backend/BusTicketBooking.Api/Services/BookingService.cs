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
    /// <summary>
    /// Handles the full booking lifecycle: creating bookings, viewing them,
    /// cancelling with tiered refunds, and processing payments via gateway or wallet.
    ///
    /// Key behaviours:
    ///   - Seat availability is checked inside a serializable transaction to prevent
    ///     two users from booking the same seat simultaneously.
    ///   - Promo code validation and UsedCount increment happen atomically inside
    ///     the same transaction as booking creation.
    ///   - Cancellation refunds follow a time-based policy:
    ///       48h+ before departure → 100% refund
    ///       24–48h before         → 75% refund
    ///       6–24h before          → 50% refund
    ///       0–6h before           → 25% refund
    ///       Already departed      → no refund
    ///   - Refunds are credited to the user's in-app wallet automatically.
    /// </summary>
    public class BookingService : IBookingService
    {
        private readonly IRepository<Booking> _bookings;
        private readonly IRepository<BookingPassenger> _passengers;
        private readonly IRepository<Payment> _payments;
        private readonly IRepository<BusSchedule> _schedules;
        private readonly AppDbContext _db;
        private readonly IWalletService _wallet;

        public BookingService(
            IRepository<Booking> bookings,
            IRepository<BookingPassenger> passengers,
            IRepository<Payment> payments,
            IRepository<BusSchedule> schedules,
            AppDbContext db,
            IWalletService wallet)
        {
            _bookings = bookings;
            _passengers = passengers;
            _payments = payments;
            _schedules = schedules;
            _db = db;
            _wallet = wallet;
        }

        /// <summary>
        /// Creates a booking for a customer using a known schedule ID.
        ///
        /// Steps:
        ///   1. Validates at least one passenger is provided and no duplicate seats in the request.
        ///   2. Loads the schedule and checks it is not cancelled, not departed, and the bus is available.
        ///   3. Validates that all requested seat numbers exist on this bus.
        ///   4. Calculates total = base price × passenger count.
        ///   5. Opens a serializable transaction to prevent race conditions on seat booking.
        ///   6. Validates and applies the promo code (if provided), incrementing UsedCount atomically.
        ///   7. Checks that none of the requested seats are already taken.
        ///   8. Creates the Booking (Pending), BookingPassenger records, and a Payment (Initiated).
        ///   9. Commits the transaction and returns the full booking details.
        ///
        /// Throws InvalidOperationException for any validation failure.
        /// </summary>
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

        /// <summary>
        /// Returns all bookings for the given user, ordered newest first.
        /// Uses a direct projection to DTO (no full entity load) for performance.
        /// Also calculates the live refund policy for each Confirmed booking
        /// based on how many hours remain until departure.
        /// </summary>
        public async Task<IEnumerable<BookingResponseDto>> GetMyAsync(Guid userId, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow; // capture once, not per-row

            var data = await _db.Bookings
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAtUtc)
                .Select(b => new BookingResponseDto
                {
                    Id               = b.Id,
                    UserId           = b.UserId,
                    ScheduleId       = b.ScheduleId,
                    Status           = b.Status,
                    TotalAmount      = b.TotalAmount,
                    DiscountAmount   = b.DiscountAmount,
                    PromoCode        = b.PromoCode,
                    CreatedAtUtc     = b.CreatedAtUtc,
                    UpdatedAtUtc     = b.UpdatedAtUtc,

                    BusCode              = b.Schedule!.Bus!.Code,
                    RegistrationNumber   = b.Schedule.Bus.RegistrationNumber,
                    RouteCode            = b.Schedule.Route!.RouteCode,
                    DepartureUtc         = b.Schedule.DepartureUtc,
                    BusStatus            = b.Schedule.Bus.Status,

                    IsScheduleCancelledByOperator = b.Schedule.IsCancelledByOperator,
                    ScheduleCancelReason          = b.Schedule.CancelReason,

                    Passengers = b.Passengers.Select(p => new BookingPassengerDto
                    {
                        Name   = p.Name,
                        Age    = p.Age,
                        SeatNo = p.SeatNo
                    }).ToList()
                })
                .ToListAsync(ct);

            // Calculate refund policy in memory (only for Confirmed bookings)
            foreach (var dto in data)
            {
                if (dto.Status != BookingStatus.Confirmed) continue;

                var hours = (dto.DepartureUtc - now).TotalHours;
                int pct;
                string policy;

                if      (hours >= 48) { pct = 100; policy = "Full refund (48h+ before departure)"; }
                else if (hours >= 24) { pct = 75;  policy = "75% refund (24–48h before departure)"; }
                else if (hours >= 6)  { pct = 50;  policy = "50% refund (6–24h before departure)"; }
                else if (hours >= 0)  { pct = 25;  policy = "25% refund (0–6h before departure)"; }
                else                  { pct = 0;   policy = "No refund (trip already departed)"; }

                dto.RefundPercent = pct;
                dto.RefundAmount  = Math.Round(dto.TotalAmount * pct / 100, 2);
                dto.RefundPolicy  = policy;
            }

            return data;
        }

        /// <summary>
        /// Returns a single booking by ID.
        /// If allowPrivileged is false (regular customer), only the booking owner can see it —
        /// returns null for any other user (treated as not found by the controller).
        /// If allowPrivileged is true (admin or operator), any booking can be fetched.
        /// </summary>
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

        /// <summary>
        /// Cancels a booking and automatically issues a wallet refund based on the
        /// time remaining before departure:
        ///   48h+ → 100% | 24–48h → 75% | 6–24h → 50% | 0–6h → 25% | departed → 0%
        ///
        /// Refunds are only issued for Confirmed bookings with a successful payment.
        /// Pending (unpaid) bookings are cancelled with no refund.
        /// Already-cancelled or operator-cancelled bookings return true immediately (idempotent).
        /// Throws UnauthorizedAccessException if allowPrivileged is false and the user doesn't own the booking.
        /// Returns false if the booking does not exist.
        /// </summary>
        public async Task<bool> CancelAsync(Guid userId, Guid bookingId, bool allowPrivileged = false, CancellationToken ct = default)
        {
            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .Include(b => b.Payment)
                .FirstOrDefaultAsync(b => b.Id == bookingId, ct);

            if (booking is null) return false;

            if (!allowPrivileged && booking.UserId != userId)
                throw new UnauthorizedAccessException("You cannot cancel a booking you don't own.");

            if (booking.Status == BookingStatus.Cancelled) return true;
            if (booking.Status == BookingStatus.OperatorCancelled) return true;

            // Calculate refund based on policy (only for confirmed bookings that were paid)
            if (booking.Status == BookingStatus.Confirmed && booking.Payment?.Status == PaymentStatus.Success)
            {
                var hoursUntilDeparture = booking.Schedule is null
                    ? 0
                    : (booking.Schedule.DepartureUtc - DateTime.UtcNow).TotalHours;

                int refundPct = hoursUntilDeparture >= 48 ? 100
                              : hoursUntilDeparture >= 24 ? 75
                              : hoursUntilDeparture >= 6  ? 50
                              : hoursUntilDeparture >= 0  ? 25
                              : 0;

                if (refundPct > 0)
                {
                    var refundAmount = Math.Round(booking.TotalAmount * refundPct / 100, 2);
                    await _wallet.CreditAsync(
                        booking.UserId, refundAmount, "CancellationRefund",
                        bookingId: bookingId,
                        description: $"Refund ({refundPct}%) for cancelled booking #{bookingId.ToString()[..8].ToUpper()}",
                        ct: ct);
                }
            }

            booking.Status = BookingStatus.Cancelled;
            booking.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return true;
        }

        /// <summary>
        /// Convenience overload — pays via external gateway (useWallet = false).
        /// </summary>
        public async Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool allowPrivileged = false, CancellationToken ct = default)
            => await PayAsync(userId, bookingId, amount, providerRef, false, allowPrivileged, ct);

        /// <summary>
        /// Marks a booking as paid and changes its status from Pending → Confirmed.
        ///
        /// Two payment modes:
        ///   useWallet = false → external gateway; providerRef is the gateway's transaction ID.
        ///   useWallet = true  → deducts the amount from the user's wallet balance.
        ///
        /// If amount is 0 or negative, the full booking total is charged.
        /// Throws InvalidOperationException if the wallet balance is insufficient.
        /// Throws InvalidOperationException if the booking is already cancelled.
        /// Returns null if the booking is not found or the user doesn't own it (when not privileged).
        /// </summary>
        public async Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool useWallet, bool allowPrivileged = false, CancellationToken ct = default)
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

            var payAmount = amount <= 0 ? booking.TotalAmount : amount;

            if (useWallet)
            {
                var debited = await _wallet.DebitAsync(
                    userId, payAmount, "BookingPayment",
                    bookingId: bookingId,
                    description: $"Payment for booking #{bookingId.ToString()[..8].ToUpper()}",
                    ct: ct);

                if (!debited)
                    throw new InvalidOperationException("Insufficient wallet balance.");

                providerRef = "WALLET";
            }

            booking.Payment ??= new Payment { BookingId = booking.Id, Amount = booking.TotalAmount };
            booking.Payment.Amount = payAmount;
            booking.Payment.Status = PaymentStatus.Success;
            booking.Payment.ProviderReference = string.IsNullOrWhiteSpace(providerRef) ? "MOCK-PAYMENT" : providerRef.Trim();

            booking.Status = BookingStatus.Confirmed;
            booking.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await LoadForResponse(bookingId, ct);
        }

        /// <summary>
        /// Creates a booking using bus code + departure UTC time instead of a schedule ID.
        /// The schedule is looked up with ±30 second tolerance on the departure time
        /// to handle minor clock differences between client and server.
        /// All other validation (seat check, promo, transaction) is identical to CreateAsync.
        /// </summary>
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

        /// <summary>
        /// Re-fetches a booking from the database with all related data
        /// (passengers, payment, bus, route) to build a fully populated response DTO.
        /// Used internally after creating or paying a booking.
        /// Returns null if the booking cannot be found (should not happen in normal flow).
        /// </summary>
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

        /// <summary>
        /// Maps a Booking entity to a BookingResponseDto.
        /// Calculates the live refund policy for Confirmed bookings based on
        /// hours remaining until departure, so the frontend can show the customer
        /// exactly how much they would get back if they cancel right now.
        /// </summary>
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

        /// <summary>
        /// Generates a list of valid seat numbers for a bus as strings: ["1", "2", ..., "40"].
        /// Used to validate that the seats a customer requested actually exist on the bus.
        /// </summary>
        private static List<string> GenerateNumericSeats(int totalSeats)
            => Enumerable.Range(1, totalSeats).Select(i => i.ToString()).ToList();

        // ===========================
        // HELPER: ENSURE DATETIME IS UTC
        // ===========================
        // Guarantees the DateTime we store and compare is always in UTC.
        // If the value is already UTC → use it as-is.
        // If it's Local time → convert it to UTC.
        // If the Kind is Unspecified (common when deserializing JSON) → treat it as UTC directly,
        // because all our API fields named "...Utc" are expected to be UTC already.
        // ===========================
        private static DateTime EnsureUtc(DateTime dt) =>
            dt.Kind switch
            {
                DateTimeKind.Utc => dt,
                DateTimeKind.Local => dt.ToUniversalTime(),
                _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            };

        /// <summary>Returns booking totals for the operator's fleet.</summary>
        public async Task<object> GetOperatorStatsAsync(Guid operatorUserId, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking()
                .FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct);

            if (op is null) return new { totalBookings = 0, confirmedBookings = 0, revenue = 0m };

            var busIds = await _db.Buses.AsNoTracking()
                .Where(b => b.OperatorId == op.Id)
                .Select(b => b.Id)
                .ToListAsync(ct);

            var scheduleIds = await _db.BusSchedules.AsNoTracking()
                .Where(s => busIds.Contains(s.BusId))
                .Select(s => s.Id)
                .ToListAsync(ct);

            var bookings = await _db.Bookings.AsNoTracking()
                .Where(b => scheduleIds.Contains(b.ScheduleId))
                .ToListAsync(ct);

            return new
            {
                totalBookings     = bookings.Count,
                confirmedBookings = bookings.Count(b => b.Status == BookingStatus.Confirmed),
                revenue           = bookings.Where(b => b.Status == BookingStatus.Confirmed).Sum(b => b.TotalAmount)
            };
        }

        /// <summary>
        /// Returns all bookings for a schedule.
        /// Operators are restricted to their own buses; admins see all.
        /// </summary>
        public async Task<IEnumerable<BookingResponseDto>> GetByScheduleAsync(Guid scheduleId, Guid callerUserId, string callerRole, CancellationToken ct = default)
        {
            if (callerRole == Roles.Operator)
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == callerUserId, ct);

                if (op is null) return Array.Empty<BookingResponseDto>();

                var schedule = await _db.BusSchedules.AsNoTracking()
                    .Include(s => s.Bus)
                    .FirstOrDefaultAsync(s => s.Id == scheduleId, ct);

                if (schedule is null || schedule.Bus?.OperatorId != op.Id)
                    throw new BusTicketBooking.Exceptions.ForbiddenException("You do not own this schedule.");
            }

            var bookings = await _db.Bookings.AsNoTracking()
                .Include(b => b.Passengers)
                .Include(b => b.Schedule).ThenInclude(s => s!.Bus)
                .Include(b => b.Schedule).ThenInclude(s => s!.Route)
                .Where(b => b.ScheduleId == scheduleId)
                .OrderBy(b => b.CreatedAtUtc)
                .ToListAsync(ct);

            return bookings.Select(b => new BookingResponseDto
            {
                Id                 = b.Id,
                UserId             = b.UserId,
                ScheduleId         = b.ScheduleId,
                Status             = b.Status,
                TotalAmount        = b.TotalAmount,
                CreatedAtUtc       = b.CreatedAtUtc,
                UpdatedAtUtc       = b.UpdatedAtUtc,
                BusCode            = b.Schedule?.Bus?.Code ?? "",
                RegistrationNumber = b.Schedule?.Bus?.RegistrationNumber ?? "",
                RouteCode          = b.Schedule?.Route?.RouteCode ?? "",
                DepartureUtc       = b.Schedule?.DepartureUtc ?? default,
                BusStatus          = b.Schedule?.Bus?.Status ?? BusStatus.Available,
                Passengers         = b.Passengers.Select(p => new BookingPassengerDto
                {
                    Name   = p.Name,
                    Age    = p.Age,
                    SeatNo = p.SeatNo
                }).ToList()
            });
        }

        /// <summary>
        /// Marks a booking as BusMissed and credits a 75% refund to the user's wallet.
        /// Window: 5 minutes before to 5 minutes after departure.
        /// </summary>
        public async Task<BusMissResultDto> BusMissAsync(Guid userId, Guid bookingId, CancellationToken ct = default)
        {
            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .Include(b => b.Payment)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId, ct)
                ?? throw new BusTicketBooking.Exceptions.NotFoundException("Booking not found.");

            if (booking.Status != BookingStatus.Confirmed)
                throw new BusTicketBooking.Exceptions.ValidationException("Only confirmed bookings can be marked as bus-missed.");

            if (booking.Schedule is null)
                throw new BusTicketBooking.Exceptions.ValidationException("Schedule information not available.");

            var now         = DateTime.UtcNow;
            var departure   = DateTime.SpecifyKind(booking.Schedule.DepartureUtc, DateTimeKind.Utc);
            var windowOpen  = departure.AddMinutes(-5);
            var windowClose = departure.AddMinutes(5);

            if (now < windowOpen)
                throw new BusTicketBooking.Exceptions.ValidationException("Bus miss can only be reported from 5 minutes before departure.");

            if (now > windowClose)
                throw new BusTicketBooking.Exceptions.ValidationException("Bus miss window has closed (5 minutes after departure).");

            var refundAmount = Math.Round(booking.TotalAmount * 0.75m, 2);

            booking.Status       = BookingStatus.BusMissed;
            booking.UpdatedAtUtc = now;

            if (booking.Payment != null)
            {
                booking.Payment.Amount            = refundAmount;
                booking.Payment.Status            = PaymentStatus.Success;
                booking.Payment.ProviderReference = "BUS-MISS-REFUND";
                booking.Payment.UpdatedAtUtc      = now;
            }

            await _db.SaveChangesAsync(ct);

            await _wallet.CreditAsync(
                userId, refundAmount, "BusMissRefund",
                bookingId: bookingId,
                description: $"75% refund for missed bus — booking #{bookingId.ToString()[..8].ToUpper()}",
                ct: ct);

            return new BusMissResultDto
            {
                BookingId      = booking.Id,
                Status         = booking.Status.ToString(),
                OriginalAmount = booking.TotalAmount,
                RefundAmount   = refundAmount,
                Message        = $"Bus miss recorded. ₹{refundAmount} (75%) has been added to your wallet."
            };
        }
    }
}