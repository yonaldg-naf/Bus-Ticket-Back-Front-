using System;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Models
{
    public class Payment : BaseEntity
    {
        public Guid BookingId { get; set; }
        public PaymentStatus Status { get; set; } = PaymentStatus.Initiated;
        public string ProviderReference { get; set; } = string.Empty;
        public decimal Amount { get; set; }

        public Booking? Booking { get; set; }
    }
}