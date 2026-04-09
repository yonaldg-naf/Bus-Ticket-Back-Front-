using System.Collections.Generic;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Models
{
    public class Bus : BaseEntity
    {
        public string Code { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public BusType BusType { get; set; }
        public BusStatus Status { get; set; } = BusStatus.Available;
        public int TotalSeats { get; set; } = 40;

        /// <summary>Comma-separated amenities e.g. "AC,WiFi,ChargingPort"</summary>
        public string? Amenities { get; set; }

        public ICollection<BusSchedule> Schedules { get; set; } = new List<BusSchedule>();
    }
}
