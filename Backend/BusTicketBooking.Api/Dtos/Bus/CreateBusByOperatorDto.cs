using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    /// <summary>
    /// Create a bus by operator's username or company name (no OperatorId needed).
    /// </summary>
    public class CreateBusByOperatorDto
    {
        /// <summary>Operator's username (preferred). At least one of Username or CompanyName is required.</summary>
        [MaxLength(100)]
        public string? OperatorUsername { get; set; }

        /// <summary>Operator's registered company name. Used if username not provided.</summary>
        [MaxLength(200)]
        public string? CompanyName { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required]
        public BusType BusType { get; set; }

        [Range(1, 100)]
        public int TotalSeats { get; set; } = 40;

        public BusStatus Status { get; set; } = BusStatus.Available;
    }
}