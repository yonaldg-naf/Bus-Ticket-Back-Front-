using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    public class CreateBusRequestDto
    {
        [Required, MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required, MaxLength(50)]
        public string RegistrationNumber { get; set; } = string.Empty;

        [Required]
        public BusType BusType { get; set; }

        [Range(1, 100)]
        public int TotalSeats { get; set; } = 40;

        public BusStatus Status { get; set; } = BusStatus.Available;

        public List<string> Amenities { get; set; } = new();
    }
}
