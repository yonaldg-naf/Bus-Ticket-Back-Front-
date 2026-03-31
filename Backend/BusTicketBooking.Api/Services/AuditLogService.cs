using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.AuditLogs;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BusTicketBooking.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(AppDbContext db, ILogger<AuditLogService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task LogAuditAsync(
            string action, string description,
            Guid? userId = null, string? username = null, string? userRole = null,
            string? entityType = null, string? entityId = null,
            string? httpMethod = null, string? endpoint = null,
            int? statusCode = null, long? durationMs = null,
            bool isSuccess = true, CancellationToken ct = default)
        {
            try
            {
                // Truncate to column limits to prevent silent DB failures
                _db.AuditLogs.Add(new AuditLog
                {
                    LogType     = Truncate("Audit", 10),
                    Action      = Truncate(action, 50),
                    Description = Truncate(description, 500),
                    UserId      = userId,
                    Username    = TruncateNullable(username, 100),
                    UserRole    = TruncateNullable(userRole, 30),
                    EntityType  = TruncateNullable(entityType, 50),
                    EntityId    = TruncateNullable(entityId, 100),
                    HttpMethod  = TruncateNullable(httpMethod, 10),
                    Endpoint    = TruncateNullable(endpoint, 250),
                    StatusCode  = statusCode,
                    DurationMs  = durationMs,
                    IsSuccess   = isSuccess,
                });
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist audit log. Action={Action} Endpoint={Endpoint}", action, endpoint);
            }
        }

        public async Task LogErrorAsync(
            string description, string? detail = null,
            Guid? userId = null, string? username = null,
            string? endpoint = null, int? statusCode = null,
            CancellationToken ct = default)
        {
            try
            {
                _db.AuditLogs.Add(new AuditLog
                {
                    LogType     = "Error",
                    Action      = "ERROR",
                    Description = Truncate(description, 500),
                    Detail      = TruncateNullable(detail, 4000),
                    UserId      = userId,
                    Username    = TruncateNullable(username, 100),
                    Endpoint    = TruncateNullable(endpoint, 250),
                    StatusCode  = statusCode,
                    IsSuccess   = false,
                });
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist error log. Endpoint={Endpoint}", endpoint);
            }
        }

        private static string Truncate(string? value, int maxLength)
            => value is null ? string.Empty : value.Length <= maxLength ? value : value[..maxLength];

        private static string? TruncateNullable(string? value, int maxLength)
            => value is null ? null : value.Length <= maxLength ? value : value[..maxLength];

        public async Task<PagedAuditLogResult> GetLogsAsync(AuditLogQueryDto q, CancellationToken ct = default)
        {
            var query = _db.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.LogType)) query = query.Where(l => l.LogType == q.LogType);
            if (!string.IsNullOrWhiteSpace(q.Username)) query = query.Where(l => l.Username != null && l.Username.Contains(q.Username));
            if (!string.IsNullOrWhiteSpace(q.EntityType)) query = query.Where(l => l.EntityType == q.EntityType);
            if (q.IsSuccess.HasValue) query = query.Where(l => l.IsSuccess == q.IsSuccess.Value);
            if (q.From.HasValue) query = query.Where(l => l.CreatedAtUtc >= q.From.Value);
            if (q.To.HasValue) query = query.Where(l => l.CreatedAtUtc <= q.To.Value);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(l => l.CreatedAtUtc)
                .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
                .Select(l => new AuditLogResponseDto
                {
                    Id = l.Id,
                    LogType = l.LogType,
                    Action = l.Action,
                    Description = l.Description,
                    Detail = l.Detail,
                    Username = l.Username,
                    UserRole = l.UserRole,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    HttpMethod = l.HttpMethod,
                    Endpoint = l.Endpoint,
                    StatusCode = l.StatusCode,
                    DurationMs = l.DurationMs,
                    IsSuccess = l.IsSuccess,
                    CreatedAtUtc = l.CreatedAtUtc,
                }).ToListAsync(ct);

            return new PagedAuditLogResult { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
        }
    }
}
