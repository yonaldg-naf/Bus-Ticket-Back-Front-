using System;
using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class BusSchedule : BaseEntity
    {
        public Guid BusId { get; set; }
        public Guid RouteId { get; set; }

        public DateTime DepartureUtc { get; set; }
        public decimal BasePrice { get; set; }

        public Bus? Bus { get; set; }
        public BusRoute? Route { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}