using System;

namespace BusTicketBooking.Models
{
    public class Announcement
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ScheduleId { get; set; }
        public BusSchedule? Schedule { get; set; }
        public Guid OperatorId { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = "Info"; // Info | Warning | Delay | Cancelled
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
