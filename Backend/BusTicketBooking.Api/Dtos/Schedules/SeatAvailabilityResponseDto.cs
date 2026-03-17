namespace BusTicketBooking.Dtos.Schedules
{
    public class SeatAvailabilityResponseDto
    {
        public Guid ScheduleId { get; set; }
        public int TotalSeats { get; set; }
        public int BookedCount { get; set; }
        public int AvailableCount { get; set; }

        /// <summary>
        /// Numeric seat labels "1".."N" for v1
        /// </summary>
        public List<string> AvailableSeats { get; set; } = new();
        public List<string> BookedSeats { get; set; } = new();
    }
}