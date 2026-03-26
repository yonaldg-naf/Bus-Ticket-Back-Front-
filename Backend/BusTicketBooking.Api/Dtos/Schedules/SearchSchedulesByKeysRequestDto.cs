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

        /// <summary>
        /// UTC offset of the customer's timezone in minutes (e.g. +330 for IST).
        /// Used to convert the local date to a UTC window for correct filtering.
        /// </summary>
        public int UtcOffsetMinutes { get; set; } = 0;

        /// <summary>Allowed: "departure", "price", "busCode", "routeCode"</summary>
        [MaxLength(50)]
        public string? SortBy { get; set; } = "departure";

        /// <summary>"asc" or "desc"</summary>
        [MaxLength(4)]
        public string? SortDir { get; set; } = "asc";

        /// <summary>Optional: filter by bus type (1=Seater,2=SemiSleeper,3=Sleeper,4=AC,5=NonAC)</summary>
        public int? BusType { get; set; }

        /// <summary>Optional: minimum price filter</summary>
        public decimal? MinPrice { get; set; }

        /// <summary>Optional: maximum price filter</summary>
        public decimal? MaxPrice { get; set; }

        [Range(1, 100)]
        public int Page { get; set; } = 1;

        [Range(1, 100)]
        public int PageSize { get; set; } = 50;
    }
}