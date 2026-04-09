namespace BusTicketBooking.Dtos.Routes
{
    public class RouteResponseDto
    {
        public Guid Id { get; set; }
        public string RouteCode { get; set; } = string.Empty;
        public List<RouteStopViewDto> Stops { get; set; } = new();
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
    }

    public class RouteStopViewDto
    {
        public Guid StopId { get; set; }
        public int Order { get; set; }
        public int? ArrivalOffsetMin { get; set; }
        public int? DepartureOffsetMin { get; set; }
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }
}
