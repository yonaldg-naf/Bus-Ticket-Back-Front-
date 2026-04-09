using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Dtos.Common;

namespace BusTicketBooking.Dtos.Routes
{
    public class CreateRouteByKeysRequestDto
    {
        [Required, MaxLength(50)]
        public string RouteCode { get; set; } = string.Empty;

        [MinLength(2)]
        public List<StopRefDto> Stops { get; set; } = new();
    }
}
