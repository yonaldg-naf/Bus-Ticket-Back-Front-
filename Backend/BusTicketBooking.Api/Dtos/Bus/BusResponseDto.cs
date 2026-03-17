using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    public class BusResponseDto
    {
        public Guid Id { get; set; }
        public Guid OperatorId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public BusType BusType { get; set; }
        public int TotalSeats { get; set; }
        public BusStatus Status { get; set; }     // <-- added
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}