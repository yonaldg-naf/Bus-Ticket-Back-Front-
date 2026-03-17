using System;

namespace BusTicketBooking.Models
{
    public class RouteStop : BaseEntity
    {
        public Guid RouteId { get; set; }
        public Guid StopId { get; set; }
        public int Order { get; set; } // 1..n in route sequence

        // Optional timetable offsets in minutes from departure
        public int? ArrivalOffsetMin { get; set; }
        public int? DepartureOffsetMin { get; set; }

        public BusRoute? Route { get; set; }
        public Stop? Stop { get; set; }
    }
}