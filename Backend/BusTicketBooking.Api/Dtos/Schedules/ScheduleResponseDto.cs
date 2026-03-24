namespace BusTicketBooking.Dtos.Schedules
{
    public class ScheduleResponseDto
    {
        public Guid Id { get; set; }

        public Guid BusId { get; set; }
        public Guid RouteId { get; set; }

        public string BusCode { get; set; } = string.Empty;
        public string RegistrationNumber { get; set; } = string.Empty;
        public string RouteCode { get; set; } = string.Empty;

        public int BusType { get; set; }    // 1=Seater 2=SemiSleeper 3=Sleeper 4=AC 5=NonAC
        public int TotalSeats { get; set; }

        public DateTime DepartureUtc { get; set; }
        public decimal BasePrice { get; set; }

        public bool IsCancelledByOperator { get; set; }
        public string? CancelReason { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}