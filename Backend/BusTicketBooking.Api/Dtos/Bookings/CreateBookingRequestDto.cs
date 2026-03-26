using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Bookings
{
    public class CreateBookingRequestDto
    {
        [Required]
        public Guid ScheduleId { get; set; }

        [MinLength(1, ErrorMessage = "At least one passenger is required.")]
        public List<BookingPassengerDto> Passengers { get; set; } = new();

        /// <summary>Optional promo code to apply a discount.</summary>
        [MaxLength(50)]
        public string? PromoCode { get; set; }
    }
}