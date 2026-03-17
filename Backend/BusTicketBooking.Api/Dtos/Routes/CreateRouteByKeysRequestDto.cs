using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Dtos.Common;

namespace BusTicketBooking.Dtos.Routes
{
    /// <summary>
    /// Create a route using operator username/company name + list of stops (City/Name).
    /// </summary>
    public class CreateRouteByKeysRequestDto
    {
        [MaxLength(100)]
        public string? OperatorUsername { get; set; }

        [MaxLength(200)]
        public string? CompanyName { get; set; }

        [Required, MaxLength(50)]
        public string RouteCode { get; set; } = string.Empty;

        /// <summary>At least two stops; we auto-create missing stops (idempotent).</summary>
        [MinLength(2)]
        public List<StopRefDto> Stops { get; set; } = new();
    }
}