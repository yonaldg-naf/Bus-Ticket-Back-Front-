using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    public class CreateScheduleRequestDto
    {
        [Required]
        public Guid BusId { get; set; }

        [Required]
        public Guid RouteId { get; set; }

        [Required] // Expecting UTC or local; we'll convert to UTC in the service
        public DateTime DepartureUtc { get; set; }

        [Range(0, 100000)]
        public decimal BasePrice { get; set; }
    }
}