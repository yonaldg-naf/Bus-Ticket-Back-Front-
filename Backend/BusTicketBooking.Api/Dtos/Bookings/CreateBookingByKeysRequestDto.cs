using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Dtos.Bookings;

namespace BusTicketBooking.Dtos.Bookings
{
    /// <summary>
    /// Create a booking without ScheduleId using busCode + departureUtc (unique).
    /// </summary>
    public class CreateBookingByKeysRequestDto
    {
        [Required, MaxLength(50)]
        public string BusCode { get; set; } = string.Empty;

        /// <summary>Must be the exact UTC datetime of the bus's schedule.</summary>
        [Required]
        public DateTime DepartureUtc { get; set; }

        [MinLength(1)]
        public List<BookingPassengerDto> Passengers { get; set; } = new();

        /// <summary>Optional promo code to apply a discount.</summary>
        [MaxLength(50)]
        public string? PromoCode { get; set; }
    }
}