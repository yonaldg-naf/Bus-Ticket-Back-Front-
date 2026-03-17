using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class Stop : BaseEntity
    {
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;  // e.g., "Borivali East"
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }


        public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
    }
}