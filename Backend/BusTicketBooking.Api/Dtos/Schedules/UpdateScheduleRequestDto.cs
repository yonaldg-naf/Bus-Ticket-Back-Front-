using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    public class UpdateScheduleRequestDto
    {
        [Required]
        public Guid BusId { get; set; }

        [Required]
        public Guid RouteId { get; set; }

        [Required]
        public DateTime DepartureUtc { get; set; }

        [Range(0, 100000)]
        public decimal BasePrice { get; set; }
    }
}