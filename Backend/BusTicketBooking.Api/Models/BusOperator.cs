using System;
using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class BusOperator : BaseEntity
    {
        public Guid UserId { get; set; }                  // maps to User (Operator)
        public string CompanyName { get; set; } = string.Empty;
        public string SupportPhone { get; set; } = string.Empty;

        public User? User { get; set; }
        public ICollection<Bus> Buses { get; set; } = new List<Bus>();
        public ICollection<BusRoute> Routes { get; set; } = new List<BusRoute>();
    }
}