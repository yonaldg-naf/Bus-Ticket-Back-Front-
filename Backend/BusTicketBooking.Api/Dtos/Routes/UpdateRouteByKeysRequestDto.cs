using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Dtos.Common;

namespace BusTicketBooking.Dtos.Routes
{
    /// <summary>
    /// Update a route's code/stops by operator + current routeCode.
    /// </summary>
    public class UpdateRouteByKeysRequestDto
    {
        [Required, MaxLength(50)]
        public string NewRouteCode { get; set; } = string.Empty;

        [MinLength(2)]
        public List<StopRefDto> Stops { get; set; } = new();
    }
}