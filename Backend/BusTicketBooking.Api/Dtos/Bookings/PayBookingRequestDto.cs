using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Bookings
{
    public class PayBookingRequestDto
    {
        [Range(0, 100000)]
        public decimal Amount { get; set; }

        [MaxLength(100)]
        public string ProviderReference { get; set; } = "MOCK-PAYMENT";

        /// <summary>If true, deduct from the user's wallet balance instead of external payment.</summary>
        public bool UseWallet { get; set; } = false;
    }
}
