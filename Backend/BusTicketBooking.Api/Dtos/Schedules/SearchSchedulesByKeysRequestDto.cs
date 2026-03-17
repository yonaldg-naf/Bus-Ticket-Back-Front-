using System;
using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Dtos.Common;

namespace BusTicketBooking.Dtos.Schedules
{
    /// <summary>
    /// Search schedules by from/to city & stop names (stop names optional).
    /// </summary>
    public class SearchSchedulesByKeysRequestDto
    {
        [Required, MaxLength(100)]
        public string FromCity { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? FromStopName { get; set; }

        [Required, MaxLength(100)]
        public string ToCity { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? ToStopName { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        /// <summary>Allowed: "departure", "price", "busCode", "routeCode"</summary>
        [MaxLength(50)]
        public string? SortBy { get; set; } = "departure";

        /// <summary>"asc" or "desc"</summary>
        [MaxLength(4)]
        public string? SortDir { get; set; } = "asc";

        [Range(1, 100)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 10;
    }
}