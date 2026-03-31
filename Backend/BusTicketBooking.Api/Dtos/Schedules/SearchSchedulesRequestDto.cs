using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    /// <summary>Search schedules by stop IDs + date (POST body).</summary>
    public class SearchSchedulesRequestDto
    {
        [Required]
        public Guid FromStopId { get; set; }

        [Required]
        public Guid ToStopId { get; set; }

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
