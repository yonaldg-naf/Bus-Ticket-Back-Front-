using System;
using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class BusRoute : BaseEntity
    {
        public Guid OperatorId { get; set; }
        public string RouteCode { get; set; } = string.Empty; // unique per operator, e.g., "MUM-PUN-01"

        public BusOperator? Operator { get; set; }
        public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
        public ICollection<BusSchedule> Schedules { get; set; } = new List<BusSchedule>();
    }
}