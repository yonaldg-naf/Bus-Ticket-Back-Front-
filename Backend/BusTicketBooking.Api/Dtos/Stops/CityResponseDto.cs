using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Stops
{
    public class CityResponseDto
    {
        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        /// <summary>Total stops configured in this city (for UX hints).</summary>
        public int StopCount { get; set; }
    }
}