using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bookings
{
    public class BookingResponseDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid ScheduleId { get; set; }
        public BookingStatus Status { get; set; }
        public decimal TotalAmount { get; set; }
        public string? PromoCode { get; set; }
        public decimal DiscountAmount { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }

        // Helpful display info
        public string BusCode { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string RouteCode { get; set; } = string.Empty;
        public DateTime DepartureUtc { get; set; }

        // <-- existing: surface current bus status to the customer
        public BusStatus BusStatus { get; set; }

        // ----------------------------------------------------------
        // NEW FIELDS for operator‑cancelled schedule visibility
        // ----------------------------------------------------------

        /// <summary>
        /// True when the operator cancels the schedule.
        /// </summary>
        public bool IsScheduleCancelledByOperator { get; set; }

        /// <summary>
        /// Optional reason shown to customers ("Cancelled by operator").
        /// </summary>
        public string? ScheduleCancelReason { get; set; }

        public List<BookingPassengerDto> Passengers { get; set; } = new();

        // Refund policy fields
        public decimal? RefundAmount { get; set; }
        public int? RefundPercent { get; set; }
        public string? RefundPolicy { get; set; }
    }
}