using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Reviews;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages customer reviews for bus trips.
    /// Reviews can only be submitted after a confirmed trip has departed.
    /// One review is allowed per booking.
    /// </summary>
    public class ReviewService : IReviewService
    {
        private readonly AppDbContext _db;

        public ReviewService(AppDbContext db) => _db = db;

        /// <summary>
        /// Creates a new review for a completed trip.
        ///
        /// Rules enforced:
        ///   - The booking must belong to the user submitting the review.
        ///   - The booking must be in Confirmed status.
        ///   - The trip must have already departed (no reviewing future trips).
        ///   - Only one review is allowed per booking (duplicate check).
        ///
        /// Throws NotFoundException if the booking doesn't exist or doesn't belong to the user.
        /// Throws ConflictException if the booking isn't confirmed, the trip hasn't departed, or a review already exists.
        /// Returns the created review with user name, bus code, and route code.
        /// </summary>
        public async Task<ReviewResponseDto> CreateAsync(Guid userId, CreateReviewRequestDto dto, CancellationToken ct = default)
        {
            var booking = await _db.Bookings
                .Include(b => b.Schedule)
                .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.UserId == userId, ct)
                ?? throw new NotFoundException("Booking not found.");

            if (booking.Status != BookingStatus.Confirmed)
                throw new ConflictException("You can only review confirmed bookings.");

            if (booking.Schedule != null && booking.Schedule.DepartureUtc > DateTime.UtcNow)
                throw new ConflictException("You can only review a trip after it has departed.");

            var exists = await _db.Reviews.AnyAsync(r => r.BookingId == dto.BookingId, ct);
            if (exists) throw new ConflictException("You have already reviewed this booking.");

            var review = new Review
            {
                BookingId  = dto.BookingId,
                UserId     = userId,
                ScheduleId = booking.ScheduleId,
                Rating     = dto.Rating,
                Comment    = dto.Comment?.Trim()
            };

            _db.Reviews.Add(review);
            await _db.SaveChangesAsync(ct);

            return await MapAsync(review.Id, ct)
                ?? throw new InvalidOperationException("Failed to load created review.");
        }

        /// <summary>
        /// Returns all reviews for a specific schedule, ordered newest first.
        /// Includes the reviewer's name, rating, comment, bus code, and route code.
        /// Used on the schedule detail page to show passengers what others thought of the trip.
        /// </summary>
        public async Task<IEnumerable<ReviewResponseDto>> GetByScheduleAsync(Guid scheduleId, CancellationToken ct = default)
        {
            var reviews = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .Where(r => r.ScheduleId == scheduleId)
                .OrderByDescending(r => r.CreatedAtUtc)
                .ToListAsync(ct);

            return reviews.Select(Map);
        }

        /// <summary>
        /// Returns a rating summary for a specific schedule.
        /// Includes the average rating, total review count, and a breakdown of how many
        /// reviews gave each star rating (1 through 5).
        /// Used to display the star rating widget on the schedule detail page.
        /// </summary>
        public async Task<ScheduleRatingSummaryDto> GetSummaryAsync(Guid scheduleId, CancellationToken ct = default)
        {
            var reviews = await _db.Reviews
                .Where(r => r.ScheduleId == scheduleId)
                .ToListAsync(ct);

            var starCounts = new int[5];
            foreach (var r in reviews)
                if (r.Rating >= 1 && r.Rating <= 5)
                    starCounts[r.Rating - 1]++;

            return new ScheduleRatingSummaryDto
            {
                ScheduleId    = scheduleId,
                AverageRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                TotalReviews  = reviews.Count,
                StarCounts    = starCounts
            };
        }

        /// <summary>
        /// Returns the review the current user submitted for a specific booking.
        /// Used to check if the user has already reviewed a trip, and to show their existing review.
        /// Returns null if no review exists for that booking by that user.
        /// </summary>
        public async Task<ReviewResponseDto?> GetMyReviewAsync(Guid userId, Guid bookingId, CancellationToken ct = default)
        {
            var review = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Bus)
                .Include(r => r.Booking).ThenInclude(b => b!.Schedule).ThenInclude(s => s!.Route)
                .FirstOrDefaultAsync(r => r.BookingId == bookingId && r.UserId == userId, ct);

            return review is null ? null : Map(review);
        }

        /// <summary>
        /// Maps a Review entity to a ReviewResponseDto.
        /// Falls back to "Anonymous" if the user's full name is not set.
        /// </summary>
        private static ReviewResponseDto Map(Review r) => new()
        {
            Id           = r.Id,
            BookingId    = r.BookingId,
            ScheduleId   = r.ScheduleId,
            UserFullName = r.User?.FullName ?? "Anonymous",
            Rating       = r.Rating,
            Comment      = r.Comment,
            CreatedAtUtc = r.CreatedAtUtc,
            BusCode      = r.Booking?.Schedule?.Bus?.Code ?? string.Empty,
            RouteCode    = r.Booking?.Schedule?.Route?.RouteCode ?? string.Empty,
        };

        /// <summary>
        /// Internal helper that re-fetches a review by ID with all related data
        /// (user, booking, schedule, bus, route) and maps it to a response DTO.
        /// Used after creating a review to return the full populated response.
        /// Returns null if the review is not found.
        /// </summary>
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
