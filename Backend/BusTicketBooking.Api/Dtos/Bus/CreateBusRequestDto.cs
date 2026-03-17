using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    public class CreateBusRequestDto
    {
        [Required]
        public Guid OperatorId { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty; // unique per operator

        [Required, MaxLength(50)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required]
        public BusType BusType { get; set; }

        [Range(1, 100)]
        public int TotalSeats { get; set; } = 40;

        // Optional on create; defaults to Available
        public BusStatus Status { get; set; } = BusStatus.Available;  // <-- added
    }
}
