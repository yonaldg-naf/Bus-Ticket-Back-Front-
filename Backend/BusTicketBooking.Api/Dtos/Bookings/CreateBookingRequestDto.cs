using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Bookings
{
    public class CreateBookingRequestDto
    {
        [Required]
        public Guid ScheduleId { get; set; }

        [MinLength(1, ErrorMessage = "At least one passenger is required.")]
        public List<BookingPassengerDto> Passengers { get; set; } = new();
    }
}