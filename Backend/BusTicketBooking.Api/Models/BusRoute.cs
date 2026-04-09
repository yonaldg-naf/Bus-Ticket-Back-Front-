using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class BusRoute : BaseEntity
    {
        public string RouteCode { get; set; } = string.Empty;

        public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
        public ICollection<BusSchedule> Schedules { get; set; } = new List<BusSchedule>();
    }
}
