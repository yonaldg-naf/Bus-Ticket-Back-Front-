using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    /// <summary>Search schedules by city names + date (POST body).</summary>
    public class SearchSchedulesByCityRequestDto
    {
        [Required, MaxLength(100)]
        public string FromCity { get; set; } = string.Empty;

        [Required, MaxLength(100)]
        public string ToCity { get; set; } = string.Empty;

        [Required]
        public DateOnly Date { get; set; }

        public int UtcOffsetMinutes { get; set; } = 0;

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 10;

        [MaxLength(50)]
        public string? SortBy { get; set; } = "departure";

        [MaxLength(4)]
        public string? SortDir { get; set; } = "asc";
    }
}
