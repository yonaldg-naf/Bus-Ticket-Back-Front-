using System;

namespace BusTicketBooking.Models
{
    public class AuditLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string LogType { get; set; } = "Audit"; // "Audit" | "Error"
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Detail { get; set; }
        public Guid? UserId { get; set; }
        public string? Username { get; set; }
        public string? UserRole { get; set; }
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? HttpMethod { get; set; }
        public string? Endpoint { get; set; }
        public int? StatusCode { get; set; }
        public long? DurationMs { get; set; }
        public bool IsSuccess { get; set; } = true;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
