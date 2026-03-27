using System;
using System.Collections.Generic;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Models
{
    public class Bus : BaseEntity
    {
        public Guid OperatorId { get; set; }
        public string Code { get; set; } = string.Empty; // unique per operator
        public string RegistrationNumber { get; set; } = string.Empty;
        public BusType BusType { get; set; }

        // Operational status
        public BusStatus Status { get; set; } = BusStatus.Available;

        // Simple layout fields for v1; (a separate SeatLayout entity can be added later)
        public int TotalSeats { get; set; } = 40;

        /// <summary>
        /// Comma-separated list of amenities e.g. "AC,WiFi,ChargingPort,WaterBottle,Blanket"
        /// </summary>
        public string? Amenities { get; set; }

        public BusOperator? Operator { get; set; }
        public ICollection<BusSchedule> Schedules { get; set; } = new List<BusSchedule>();
    }
}
