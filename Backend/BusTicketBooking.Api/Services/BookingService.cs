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
        private readonly WalletService _wallet;

        public BookingService(
            IRepository<Booking> bookings,
            IRepository<BookingPassenger> passengers,
            IRepository<Payment> payments,
            IRepository<BusSchedule> schedules,
            AppDbContext db,
            WalletService wallet)
        {
            _bookings = bookings;
            _passengers = passengers;
            _payments = payments;
            _schedules = schedules;
            _db = db;
            _wallet = wallet;
        }

        // ===========================
        // CREATE BOOKING (BY SCHEDULE ID)
        // ===========================
        // Called when a customer books a trip using a known schedule ID.
        // Steps:
        //   1. Validates that at least one passenger is provided and no duplicate seats exist in the request.
        //   2. Loads the schedule (with its bus and route) from the database.
        //   3. Checks the schedule is not cancelled, not already departed, and the bus is available.
        //   4. Validates that the requested seat numbers actually exist on this bus (e.g. seat 45 on a 40-seat bus is rejected).
        //   5. Calculates the total price = base price × number of passengers.
        //   6. Opens a serializable database transaction so no two users can grab the same seat at the same time.
        //   7. If a promo code was provided, validates it (active, not expired, usage limit not reached, minimum amount met)
        //      and calculates the discount. Increments the promo's UsedCount inside the transaction so it's atomic.
        //   8. Checks that none of the requested seats are already taken by another active booking.
        //   9. Creates the Booking record (status = Pending), BookingPassenger records, and a Payment record (status = Initiated).
        //  10. Commits the transaction and returns the full booking details.
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
        // GET ALL BOOKINGS FOR A USER
        // ===========================
        // Returns every booking that belongs to the given user, ordered newest first.
        // Loads the passengers, payment, bus, and route details in a single query
        // so the response has everything the frontend needs without extra round trips.
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
        // GET A SINGLE BOOKING BY ID
        // ===========================
        // Fetches one booking by its ID.
        // If allowPrivileged is true (admin or operator), any booking can be fetched.
        // If allowPrivileged is false (regular customer), only the booking owner can see it —
        // anyone else gets null back (treated as not found by the controller).
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
        // CANCEL A BOOKING
        // ===========================
        // Cancels a booking and automatically issues a wallet refund based on how far
        // in advance the cancellation happens:
        //   48h+ before departure  → 100% refund
        //   24–48h before          → 75% refund
        //   6–24h before           → 50% refund
        //   0–6h before            → 25% refund
        //   Already departed       → no refund
        //
        // Refunds are only issued if the booking was Confirmed AND the payment was successful.
        // Pending bookings (not yet paid) are cancelled without any refund.
        // If allowPrivileged is false, only the booking owner can cancel it.
        // ===========================
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

        // ===========================
        // PAY FOR A BOOKING
        // ===========================
        // Short overload — convenience wrapper that calls the full version with useWallet = false.
        // Use this when paying via an external payment gateway (not wallet).
        // ===========================
        public async Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool allowPrivileged = false, CancellationToken ct = default)
            => await PayAsync(userId, bookingId, amount, providerRef, false, allowPrivileged, ct);

        // ===========================
        // PAY FOR A BOOKING (FULL VERSION)
        // ===========================
        // Marks a booking as paid and changes its status from Pending → Confirmed.
        // Two payment modes:
        //   useWallet = false → external gateway (providerRef is the gateway's transaction ID)
        //   useWallet = true  → deducts the amount from the user's wallet balance
        //
        // If amount is 0 or negative, the full booking total is charged.
        // If the wallet doesn't have enough balance, an error is thrown.
        // After payment, the booking status becomes Confirmed and the payment record is updated.
        // ===========================
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

        // ===========================
        // CREATE BOOKING (BY BUS CODE + DEPARTURE TIME)
        // ===========================
        // Same logic as CreateAsync above, but instead of a schedule ID the caller provides
        // a bus code (e.g. "BUS-001") and a departure time in UTC.
        // The schedule is looked up with a ±30 second tolerance on the departure time
        // to handle minor clock differences between client and server.
        // Everything else (seat validation, promo, transaction) is identical to CreateAsync.
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
        // LOAD BOOKING FOR RESPONSE
        // ===========================
        // Internal helper used after creating or paying a booking.
        // Re-fetches the booking from the database with all related data
        // (passengers, payment, bus, route) so the response DTO is fully populated.
        // Returns null if the booking somehow can't be found (shouldn't happen in normal flow).
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
        // MAP BOOKING ENTITY → RESPONSE DTO
        // ===========================
        // Converts a Booking database entity into the BookingResponseDto that gets sent to the client.
        // Also calculates the live refund policy based on how many hours remain until departure,
        // so the frontend can show the customer exactly how much they'd get back if they cancel now.
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
        // HELPER: GENERATE SEAT NUMBERS
        // ===========================
        // Produces a list of valid seat numbers for a bus, e.g. ["1","2","3",...,"40"].
        // Used to validate that the seats a customer requested actually exist on the bus.
        // ===========================
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
    }
}