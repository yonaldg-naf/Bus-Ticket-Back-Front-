using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Complaints;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages customer complaints raised against confirmed bookings.
    /// Customers can raise a complaint after their trip has departed.
    /// Operators and admins can view and reply to complaints.
    /// </summary>
    public class ComplaintService : IComplaintService
    {
        private readonly AppDbContext _db;

        public ComplaintService(AppDbContext db) => _db = db;

        /// <summary>
        /// Raises a new complaint for a specific booking.
        ///
        /// Rules enforced:
        ///   - The booking must belong to the user raising the complaint.
        ///   - The booking must be in Confirmed status (not pending or cancelled).
        ///   - The trip must have already departed (complaints are post-travel only).
        ///
        /// Throws NotFoundException if the booking doesn't exist or doesn't belong to the user.
        /// Throws ValidationException if the booking isn't confirmed or the trip hasn't departed yet.
        /// Returns the created complaint with booking and schedule details.
        /// </summary>
        public async Task<ComplaintResponseDto> RaiseAsync(Guid userId, Guid bookingId, CreateComplaintRequestDto dto, CancellationToken ct = default)
        {
            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId, ct)
                ?? throw new NotFoundException("Booking not found.");

            if (booking.Status != BookingStatus.Confirmed)
                throw new ValidationException("Complaints can only be raised on confirmed bookings.");

            if (booking.Schedule is null || booking.Schedule.DepartureUtc > DateTime.UtcNow)
                throw new ValidationException("Complaints can only be raised during or after travel.");

            var complaint = new Complaint
            {
                BookingId = bookingId,
                UserId    = userId,
                Message   = dto.Message.Trim()
            };

            _db.Complaints.Add(complaint);
            await _db.SaveChangesAsync(ct);

            return await MapAsync(complaint.Id, ct)
                ?? throw new InvalidOperationException("Failed to load created complaint.");
        }

        /// <summary>
        /// Returns all complaints raised by the currently logged-in customer, ordered newest first.
        /// Each complaint includes the bus code, route code, departure time, and any reply from the operator.
        /// </summary>
        public async Task<IEnumerable<ComplaintResponseDto>> GetMyAsync(Guid userId, CancellationToken ct = default)
        {
            return await _db.Complaints
                .AsNoTracking()
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAtUtc)
                .Select(c => new ComplaintResponseDto
                {
                    Id           = c.Id,
                    BookingId    = c.BookingId,
                    UserId       = c.UserId,
                    CustomerName = c.User != null ? (c.User.FullName ?? c.User.Username) : string.Empty,
                    Message      = c.Message,
                    Reply        = c.Reply,
                    Status       = c.Status,
                    BusCode      = c.Booking != null && c.Booking.Schedule != null && c.Booking.Schedule.Bus != null
                        ? c.Booking.Schedule.Bus.Code : string.Empty,
                    RouteCode    = c.Booking != null && c.Booking.Schedule != null && c.Booking.Schedule.Route != null
                        ? c.Booking.Schedule.Route.RouteCode : string.Empty,
                    DepartureUtc = c.Booking != null && c.Booking.Schedule != null
                        ? c.Booking.Schedule.DepartureUtc : default,
                    CreatedAtUtc = c.CreatedAtUtc,
                    UpdatedAtUtc = c.UpdatedAtUtc
                })
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<ComplaintResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            return await _db.Complaints
                .AsNoTracking()
                .OrderByDescending(c => c.CreatedAtUtc)
                .Select(c => new ComplaintResponseDto
                {
                    Id           = c.Id,
                    BookingId    = c.BookingId,
                    UserId       = c.UserId,
                    CustomerName = c.User != null ? (c.User.FullName ?? c.User.Username) : string.Empty,
                    Message      = c.Message,
                    Reply        = c.Reply,
                    Status       = c.Status,
                    BusCode      = c.Booking != null && c.Booking.Schedule != null && c.Booking.Schedule.Bus != null
                        ? c.Booking.Schedule.Bus.Code : string.Empty,
                    RouteCode    = c.Booking != null && c.Booking.Schedule != null && c.Booking.Schedule.Route != null
                        ? c.Booking.Schedule.Route.RouteCode : string.Empty,
                    DepartureUtc = c.Booking != null && c.Booking.Schedule != null
                        ? c.Booking.Schedule.DepartureUtc : default,
                    CreatedAtUtc = c.CreatedAtUtc,
                    UpdatedAtUtc = c.UpdatedAtUtc
                })
                .ToListAsync(ct);
        }

        public async Task<ComplaintResponseDto?> ReplyAsync(Guid id, ReplyComplaintRequestDto dto, CancellationToken ct = default)
        {
            var complaint = await _db.Complaints
                .Include(c => c.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new NotFoundException("Complaint not found.");

            complaint.Reply        = dto.Reply.Trim();
            complaint.Status       = "Resolved";
            complaint.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await MapAsync(complaint.Id, ct);
        }

        /// <summary>
        /// Internal helper that re-fetches a complaint by ID with all related data
        /// (booking, schedule, bus, route, user) and maps it to a response DTO.
        /// Used after creating or replying to a complaint to return the full populated response.
        /// Returns null if the complaint is not found.
        /// </summary>
        private async Task<ComplaintResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var c = await _db.Complaints
                .Include(x => x.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(x => x.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

            if (c is null) return null;

            return new ComplaintResponseDto
            {
                Id           = c.Id,
                BookingId    = c.BookingId,
                UserId       = c.UserId,
                CustomerName = c.User?.FullName ?? c.User?.Username ?? string.Empty,
                Message      = c.Message,
                Reply        = c.Reply,
                Status       = c.Status,
                BusCode      = c.Booking?.Schedule?.Bus?.Code ?? string.Empty,
                RouteCode    = c.Booking?.Schedule?.Route?.RouteCode ?? string.Empty,
                DepartureUtc = c.Booking?.Schedule?.DepartureUtc ?? default,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            };
        }
    }
}
