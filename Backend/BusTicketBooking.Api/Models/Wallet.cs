using System;

namespace BusTicketBooking.Models
{
    public class Wallet : BaseEntity
    {
        public Guid UserId { get; set; }
        public decimal Balance { get; set; } = 0;

        public User? User { get; set; }
    }
}
