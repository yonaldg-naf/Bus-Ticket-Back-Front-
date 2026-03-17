namespace BusTicketBooking.Dtos.Stops
{
    public class UpdateStopRequestDto
    {
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}