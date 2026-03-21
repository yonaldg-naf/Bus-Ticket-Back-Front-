using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.AuditLogs;

namespace BusTicketBooking.Interfaces
{
    public interface IAuditLogService
    {
        Task LogAuditAsync(
            string action,
            string description,
            Guid? userId = null,
            string? username = null,
            string? userRole = null,
            string? entityType = null,
            string? entityId = null,
            string? httpMethod = null,
            string? endpoint = null,
            int? statusCode = null,
            long? durationMs = null,
            bool isSuccess = true,
            CancellationToken ct = default);

        Task LogErrorAsync(
            string description,
            string? detail = null,
            Guid? userId = null,
            string? username = null,
            string? endpoint = null,
            int? statusCode = null,
            CancellationToken ct = default);

        Task<PagedAuditLogResult> GetLogsAsync(AuditLogQueryDto query, CancellationToken ct = default);
    }
}
