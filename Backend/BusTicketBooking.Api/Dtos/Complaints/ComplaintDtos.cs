using System;
using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Complaints
{
    public class CreateComplaintRequestDto
    {
        [Required, MinLength(10), MaxLength(1000)]
        public string Message { get; set; } = string.Empty;
    }

    public class ReplyComplaintRequestDto
    {
        [Required, MinLength(1), MaxLength(1000)]
        public string Reply { get; set; } = string.Empty;
    }

    public class ComplaintResponseDto
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public Guid UserId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Reply { get; set; }
        public string Status { get; set; } = string.Empty;

        // Booking context
        public string BusCode { get; set; } = string.Empty;
        public string RouteCode { get; set; } = string.Empty;
        public DateTime DepartureUtc { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
