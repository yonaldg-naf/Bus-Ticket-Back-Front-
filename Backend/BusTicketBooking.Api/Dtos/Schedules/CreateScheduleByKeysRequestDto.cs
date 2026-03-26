using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    /// <summary>
    /// Create a schedule by operator + busCode + routeCode.
    /// Time can be supplied as UTC or Local with TimeZoneId.
    /// </summary>
    public class CreateScheduleByKeysRequestDto
    {
        [MaxLength(100)]
        public string? OperatorUsername { get; set; }

        [MaxLength(200)]
        public string? CompanyName { get; set; }

        [Required, MaxLength(50)]
        public string BusCode { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string RouteCode { get; set; } = string.Empty;

        /// <summary>Option A: provide exact UTC.</summary>
        public DateTime? DepartureUtc { get; set; }

        /// <summary>Option B: provide local time as string "yyyy-MM-ddTHH:mm" + TimeZoneId.</summary>
        public string? DepartureLocal { get; set; }

        /// <summary>Required when using DepartureLocal.</summary>
        [MaxLength(100)]
        public string? TimeZoneId { get; set; }

        [Range(0, 100000)]
        public decimal BasePrice { get; set; }
    }
}