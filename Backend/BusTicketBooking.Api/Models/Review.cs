using System;

namespace BusTicketBooking.Models
{
    /// <summary>Customer review for a completed trip (linked to a confirmed booking).</summary>
    public class Review : BaseEntity
    {
        public Guid BookingId { get; set; }
        public Guid UserId { get; set; }
        public Guid ScheduleId { get; set; }

        /// <summary>1–5 star rating.</summary>
        public int Rating { get; set; }

        public string? Comment { get; set; }

        public Booking? Booking { get; set; }
        public User? User { get; set; }
        public BusSchedule? Schedule { get; set; }
    }
}
