namespace BusTicketBooking.Dtos.Stops
{
    public class CreateStopRequestDto
    {
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        // Optional geo fields
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}