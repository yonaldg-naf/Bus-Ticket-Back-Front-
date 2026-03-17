using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    public class UpdateBusRequestDto
    {
        [Required, MaxLength(50)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required]
        public BusType BusType { get; set; }

        [Range(1, 100)]
        public int TotalSeats { get; set; } = 40;

        [Required]
        public BusStatus Status { get; set; } = BusStatus.Available;  // <-- added
    }
}