using System.Collections.Generic;

namespace BusTicketBooking.Models
{
    public class User : BaseEntity
    {
        // Simple custom identity (we’ll hash via Microsoft PasswordHasher<T>)
        public string Username { get; set; } = string.Empty; // unique
        public string Email { get; set; } = string.Empty;    // unique
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "Customer";       // Admin | Operator | Customer

        // Password storage
        public string PasswordHash { get; set; } = string.Empty;

        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public BusOperator? OperatorProfile { get; set; } // when Role == Operator
    }
}