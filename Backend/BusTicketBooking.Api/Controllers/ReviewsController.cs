using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Reviews;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ReviewsController(AppDbContext db) => _db = db;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Submit a review for a completed booking.</summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReviewRequestDto dto, CancellationToken ct)
        {
            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.UserId == UserId, ct);

            if (booking is null) return NotFound(new { message = "Booking not found." });
            if (booking.Status != BookingStatus.Confirmed)
                return Conflict(new { message = "You can only review confirmed bookings." });

            var exists = await _db.Reviews.AnyAsync(r => r.BookingId == dto.BookingId, ct);
            if (exists) return Conflict(new { message = "You have already reviewed this booking." });

            var review = new Review
            {
                BookingId = dto.BookingId,
                UserId = UserId,
                ScheduleId = booking.ScheduleId,
                Rating = dto.Rating,
                Comment = dto.Comment?.Trim()
            };

            _db.Reviews.Add(review);
            await _db.SaveChangesAsync(ct);

            return Ok(await MapAsync(review.Id, ct));
        }

        /// <summary>Get all reviews for a schedule.</summary>
        [AllowAnonymous]
        [HttpGet("schedule/{scheduleId:guid}")]
        public async Task<IActionResult> GetBySchedule([FromRoute] Guid scheduleId, CancellationToken ct)
        {
            var reviews = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .Where(r => r.ScheduleId == scheduleId)
                .OrderByDescending(r => r.CreatedAtUtc)
                .ToListAsync(ct);

            return Ok(reviews.Select(Map));
        }

        /// <summary>Get rating summary for a schedule.</summary>
        [AllowAnonymous]
        [HttpGet("schedule/{scheduleId:guid}/summary")]
        public async Task<IActionResult> GetSummary([FromRoute] Guid scheduleId, CancellationToken ct)
        {
            var reviews = await _db.Reviews
                .Where(r => r.ScheduleId == scheduleId)
                .ToListAsync(ct);

            var starCounts = new int[5];
            foreach (var r in reviews)
                if (r.Rating >= 1 && r.Rating <= 5)
                    starCounts[r.Rating - 1]++;

            return Ok(new ScheduleRatingSummaryDto
            {
                ScheduleId = scheduleId,
                AverageRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                TotalReviews = reviews.Count,
                StarCounts = starCounts
            });
        }

        /// <summary>Check if current user has reviewed a booking.</summary>
        [Authorize]
        [HttpGet("my/{bookingId:guid}")]
        public async Task<IActionResult> GetMyReview([FromRoute] Guid bookingId, CancellationToken ct)
        {
            var review = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .FirstOrDefaultAsync(r => r.BookingId == bookingId && r.UserId == UserId, ct);

            return review is null ? NotFound() : Ok(Map(review));
        }

        private static ReviewResponseDto Map(Review r) => new()
        {
            Id = r.Id,
            BookingId = r.BookingId,
            ScheduleId = r.ScheduleId,
            UserFullName = r.User?.FullName ?? "Anonymous",
            Rating = r.Rating,
            Comment = r.Comment,
            CreatedAtUtc = r.CreatedAtUtc,
            BusCode = r.Booking?.Schedule?.Bus?.Code ?? string.Empty,
            RouteCode = r.Booking?.Schedule?.Route?.RouteCode ?? string.Empty,
        };

        private async Task<ReviewResponseDto?> MapAsync(Guid id, CancellationToken ct)
        {
            var r = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .FirstOrDefaultAsync(r => r.Id == id, ct);
            return r is null ? null : Map(r);
        }
    }
}
