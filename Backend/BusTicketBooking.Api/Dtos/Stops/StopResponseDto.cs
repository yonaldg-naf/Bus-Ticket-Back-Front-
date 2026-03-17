using System;

namespace BusTicketBooking.Dtos.Stops
{
    public class StopResponseDto
    {
        public Guid Id { get; set; }
        public string City { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
    }
}