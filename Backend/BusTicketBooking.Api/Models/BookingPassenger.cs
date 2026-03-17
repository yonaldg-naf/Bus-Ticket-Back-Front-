using System;

namespace BusTicketBooking.Models
{
    public class BookingPassenger : BaseEntity
    {
        public Guid BookingId { get; set; }

        public string Name { get; set; } = string.Empty;
        public int? Age { get; set; }
        public string SeatNo { get; set; } = string.Empty; // e.g., "12A"

        public Booking? Booking { get; set; }
    }
}