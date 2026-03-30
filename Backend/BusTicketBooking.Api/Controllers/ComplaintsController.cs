using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Complaints;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComplaintsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ComplaintsController(AppDbContext db) => _db = db;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>
        /// Customer raises a complaint on a booking.
        /// Allowed during travel (after departure) or after trip completion.
        /// </summary>
        [Authorize(Roles = Roles.Customer)]
        [HttpPost("booking/{bookingId:guid}")]
        public async Task<IActionResult> Raise([FromRoute] Guid bookingId,
                                               [FromBody] CreateComplaintRequestDto dto,
                                               CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == UserId, ct);

            if (booking is null) return NotFound("Booking not found.");

            if (booking.Status != BookingStatus.Confirmed)
                return BadRequest(new { message = "Complaints can only be raised on confirmed bookings." });

            // Allow complaint during travel (after departure) or after trip
            if (booking.Schedule is null || booking.Schedule.DepartureUtc > DateTime.UtcNow)
                return BadRequest(new { message = "Complaints can only be raised during or after travel." });

            var complaint = new Complaint
            {
                BookingId = bookingId,
                UserId = UserId,
                Message = dto.Message.Trim()
            };

            _db.Complaints.Add(complaint);
            await _db.SaveChangesAsync(ct);

            return Ok(await MapAsync(complaint.Id, ct));
        }

        /// <summary>Customer: view their own complaints.</summary>
        [Authorize(Roles = Roles.Customer)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
        {
            var result = await _db.Complaints
                .AsNoTracking()
                .Where(c => c.UserId == UserId)
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

            return Ok(result);
        }

        /// <summary>
        /// Operator: view complaints for their buses.
        /// Admin: view all complaints.
        /// </summary>
        [Authorize(Roles = $"{Roles.Operator},{Roles.Admin}")]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            // Start with the entity query so we can filter before projecting
            IQueryable<Complaint> entityQuery = _db.Complaints.AsNoTracking();

            // Operator: filter to only complaints on their own buses
            if (User.IsInRole(Roles.Operator))
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == UserId, ct);

                if (op is null) return Ok(Array.Empty<ComplaintResponseDto>());

                entityQuery = entityQuery
                    .Where(c => c.Booking!.Schedule!.Bus!.OperatorId == op.Id);
            }

            // Project after filtering — only fetch columns we need
            var result = await entityQuery
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

            return Ok(result);
        }

        /// <summary>Operator or Admin: reply to a complaint and mark it resolved.</summary>
        [Authorize(Roles = $"{Roles.Operator},{Roles.Admin}")]
        [HttpPatch("{id:guid}/reply")]
        public async Task<IActionResult> Reply([FromRoute] Guid id,
                                               [FromBody] ReplyComplaintRequestDto dto,
                                               CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var complaint = await _db.Complaints
                .Include(c => c.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .FirstOrDefaultAsync(c => c.Id == id, ct);

            if (complaint is null) return NotFound();

            // Operator can only reply to complaints on their own buses
            if (User.IsInRole(Roles.Operator))
            {
                var op = await _db.BusOperators.AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == UserId, ct);

                if (op is null || complaint.Booking?.Schedule?.Bus?.OperatorId != op.Id)
                    return Forbid();
            }

            complaint.Reply = dto.Reply.Trim();
            complaint.Status = "Resolved";
            complaint.UpdatedAtUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return Ok(await MapAsync(complaint.Id, ct));
        }

        private static ComplaintResponseDto Map(Complaint c) => new()
        {
            Id = c.Id,
            BookingId = c.BookingId,
            UserId = c.UserId,
            CustomerName = c.User?.FullName ?? c.User?.Username ?? string.Empty,
            Message = c.Message,
            Reply = c.Reply,
            Status = c.Status,
            BusCode = c.Booking?.Schedule?.Bus?.Code ?? string.Empty,
            RouteCode = c.Booking?.Schedule?.Route?.RouteCode ?? string.Empty,
            DepartureUtc = c.Booking?.Schedule?.DepartureUtc ?? default,
            CreatedAtUtc = c.CreatedAtUtc,
            UpdatedAtUtc = c.UpdatedAtUtc
        };

        private async Task<ComplaintResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var c = await _db.Complaints
                .Include(x => x.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(x => x.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.Id == id, ct);
            return c is null ? null : Map(c);
        }
    }
}
