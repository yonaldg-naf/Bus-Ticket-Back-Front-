
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Routes
{
    public class UpdateRouteRequestDto
    {
        [Required, MaxLength(50)]
        public string RouteCode { get; set; } = string.Empty;

        // Full replacement of ordered stops (keeps it simple and deterministic)
        [MinLength(2, ErrorMessage = "At least two stops are required.")]
        public List<RouteStopItemDto> Stops { get; set; } = new();
    }
}