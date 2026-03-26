using System;

namespace BusTicketBooking.Models
{
    public class Complaint : BaseEntity
    {
        public Guid BookingId { get; set; }
        public Guid UserId { get; set; }

        /// <summary>The complaint message from the customer.</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>Optional reply from operator or admin.</summary>
        public string? Reply { get; set; }

        /// <summary>Open, Resolved</summary>
        public string Status { get; set; } = "Open";

        public Booking? Booking { get; set; }
        public User? User { get; set; }
    }
}
