using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Routes
{
    public class RouteStopItemDto
    {
        [Required]
        public Guid StopId { get; set; }

        // 1..n in sequence
        [Range(1, int.MaxValue)]
        public int Order { get; set; }

        // Optional offsets (in minutes from the route's departure)
        public int? ArrivalOffsetMin { get; set; }
        public int? DepartureOffsetMin { get; set; }
    }
}