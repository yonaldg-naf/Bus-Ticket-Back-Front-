using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Reviews
{
    public class CreateReviewRequestDto
    {
        [Required] public Guid BookingId { get; set; }
        [Range(1, 5)] public int Rating { get; set; }
        [MaxLength(1000)] public string? Comment { get; set; }
    }

    public class ReviewResponseDto
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public Guid ScheduleId { get; set; }
        public string UserFullName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public string BusCode { get; set; } = string.Empty;
        public string RouteCode { get; set; } = string.Empty;
    }

    public class ScheduleRatingSummaryDto
    {
        public Guid ScheduleId { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int[] StarCounts { get; set; } = new int[5]; // index 0 = 1 star
    }
}
