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
    public class ComplaintService : IComplaintService
    {
        private readonly AppDbContext _db;

        public ComplaintService(AppDbContext db) => _db = db;

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

        public async Task<IEnumerable<ComplaintResponseDto>> GetAllAsync(Guid callerUserId, string role, CancellationToken ct = default)
        {
            IQueryable<Complaint> query = _db.Complaints.AsNoTracking();

            if (role == Roles.Operator)
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == callerUserId, ct);

                if (op is null) return Array.Empty<ComplaintResponseDto>();

                query = query.Where(c => c.Booking!.Schedule!.Bus!.OperatorId == op.Id);
            }

            return await query
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

        public async Task<ComplaintResponseDto?> ReplyAsync(Guid callerUserId, string role, Guid id, ReplyComplaintRequestDto dto, CancellationToken ct = default)
        {
            var complaint = await _db.Complaints
                .Include(c => c.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .FirstOrDefaultAsync(c => c.Id == id, ct)
                ?? throw new NotFoundException("Complaint not found.");

            if (role == Roles.Operator)
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == callerUserId, ct);

                if (op is null || complaint.Booking?.Schedule?.Bus?.OperatorId != op.Id)
                    throw new ForbiddenException("You do not have access to this complaint.");
            }

            complaint.Reply        = dto.Reply.Trim();
            complaint.Status       = "Resolved";
            complaint.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await MapAsync(complaint.Id, ct);
        }

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
