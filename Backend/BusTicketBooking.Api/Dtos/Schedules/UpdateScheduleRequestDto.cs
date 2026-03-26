using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    public class UpdateScheduleRequestDto
    {
        /// <summary>Local departure time as string "yyyy-MM-ddTHH:mm" — not treated as UTC.</summary>
        [Required]
        public string DepartureLocal { get; set; } = string.Empty;

        /// <summary>IANA timezone id of the operator's browser (e.g. "Asia/Kolkata").</summary>
        [Required, MaxLength(100)]
        public string TimeZoneId { get; set; } = string.Empty;

        [Range(0, 100000)]
        public decimal BasePrice { get; set; }
    }
}
