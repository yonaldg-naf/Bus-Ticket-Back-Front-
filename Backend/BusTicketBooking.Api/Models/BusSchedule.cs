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

        // NEW — used when the operator cancels a schedule
        public bool IsCancelledByOperator { get; set; } = false;

        // NEW — optional reason shown to customers
        public string? CancelReason { get; set; }

        public Bus? Bus { get; set; }
        public BusRoute? Route { get; set; }
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}