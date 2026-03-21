using System;
using System.Collections.Generic;

namespace BusTicketBooking.Dtos.AuditLogs
{
    public class AuditLogQueryDto
    {
        public string? LogType { get; set; }
        public string? Username { get; set; }
        public string? EntityType { get; set; }
        public bool? IsSuccess { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 25;
    }

    public class AuditLogResponseDto
    {
        public Guid Id { get; set; }
        public string LogType { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? Detail { get; set; }
        public string? Username { get; set; }
        public string? UserRole { get; set; }
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? HttpMethod { get; set; }
        public string? Endpoint { get; set; }
        public int? StatusCode { get; set; }
        public long? DurationMs { get; set; }
        public bool IsSuccess { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }

    public class PagedAuditLogResult
    {
        public IEnumerable<AuditLogResponseDto> Items { get; set; } = [];
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    }
}
