using System;
using System.Collections.Generic;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Models
{
    public class Booking : BaseEntity
    {
        public Guid UserId { get; set; }
        public Guid ScheduleId { get; set; }

        public BookingStatus Status { get; set; } = BookingStatus.Pending;
        public decimal TotalAmount { get; set; }

        public User? User { get; set; }
        public BusSchedule? Schedule { get; set; }

        public ICollection<BookingPassenger> Passengers { get; set; } = new List<BookingPassenger>();
        public Payment? Payment { get; set; }
    }
}