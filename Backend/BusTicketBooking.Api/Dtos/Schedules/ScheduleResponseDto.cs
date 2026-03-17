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

        public DateTime DepartureUtc { get; set; }
        public decimal BasePrice { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }
}