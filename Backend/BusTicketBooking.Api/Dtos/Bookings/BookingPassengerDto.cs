using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Bookings
{
    public class BookingPassengerDto
    {
        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 120)]
        public int? Age { get; set; }

        [Required, MaxLength(10)]
        public string SeatNo { get; set; } = string.Empty;
    }
}