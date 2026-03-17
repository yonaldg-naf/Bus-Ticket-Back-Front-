
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Routes
{
    public class CreateRouteRequestDto
    {
        [Required]
        public Guid OperatorId { get; set; }

        [Required, MaxLength(50)]
        public string RouteCode { get; set; } = string.Empty;

        [MinLength(2, ErrorMessage = "At least two stops are required.")]
        public List<RouteStopItemDto> Stops { get; set; } = new();
    }
}