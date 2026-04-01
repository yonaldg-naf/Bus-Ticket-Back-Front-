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
    /// <summary>
    /// Records system activity and errors to the AuditLogs table.
    /// Called automatically by AuditMiddleware for every API request.
    ///
    /// Write operations (LogAuditAsync, LogErrorAsync) use IRepository.
    /// GetLogsAsync uses AppDbContext directly because it requires dynamic
    /// LINQ filtering and pagination that the generic repository cannot express.
    ///
    /// All write methods silently catch exceptions — a failure to write an
    /// audit log must never crash the main request.
    /// </summary>
    public class AuditLogService : IAuditLogService
    {
        private readonly IRepository<AuditLog> _logs;
        private readonly AppDbContext _db;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(IRepository<AuditLog> logs, AppDbContext db, ILogger<AuditLogService> logger)
        {
            _logs   = logs;
            _db     = db;
            _logger = logger;
        }

        /// <summary>
        /// Records a successful or failed API action to the audit log.
        /// All string values are truncated to their database column limits.
        /// If the write fails, the error is logged but NOT re-thrown.
        /// </summary>
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
                await _logs.AddAsync(new AuditLog
                {
                    LogType    = Truncate("Audit", 10),
                    Action     = Truncate(action, 50),
                    Description = Truncate(description, 500),
                    UserId     = userId,
                    Username   = TruncateNullable(username, 100),
                    UserRole   = TruncateNullable(userRole, 30),
                    EntityType = TruncateNullable(entityType, 50),
                    EntityId   = TruncateNullable(entityId, 100),
                    HttpMethod = TruncateNullable(httpMethod, 10),
                    Endpoint   = TruncateNullable(endpoint, 250),
                    StatusCode = statusCode,
                    DurationMs = durationMs,
                    IsSuccess  = isSuccess,
                }, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist audit log. Action={Action} Endpoint={Endpoint}", action, endpoint);
            }
        }

        /// <summary>
        /// Records an unhandled exception or system error to the audit log.
        /// If the write fails, the error is logged but NOT re-thrown.
        /// </summary>
        public async Task LogErrorAsync(
            string description, string? detail = null,
            Guid? userId = null, string? username = null,
            string? endpoint = null, int? statusCode = null,
            CancellationToken ct = default)
        {
            try
            {
                await _logs.AddAsync(new AuditLog
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
                }, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist error log. Endpoint={Endpoint}", endpoint);
            }
        }

        /// <summary>
        /// Returns a paginated, filtered list of audit log entries.
        /// Uses AppDbContext directly because dynamic LINQ filtering and
        /// pagination cannot be expressed through the generic repository.
        /// </summary>
        public async Task<PagedAuditLogResult> GetLogsAsync(AuditLogQueryDto q, CancellationToken ct = default)
        {
            var query = _db.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.LogType))    query = query.Where(l => l.LogType == q.LogType);
            if (!string.IsNullOrWhiteSpace(q.Username))   query = query.Where(l => l.Username != null && l.Username.Contains(q.Username));
            if (!string.IsNullOrWhiteSpace(q.EntityType)) query = query.Where(l => l.EntityType == q.EntityType);
            if (q.IsSuccess.HasValue)                      query = query.Where(l => l.IsSuccess == q.IsSuccess.Value);
            if (q.From.HasValue)                           query = query.Where(l => l.CreatedAtUtc >= q.From.Value);
            if (q.To.HasValue)                             query = query.Where(l => l.CreatedAtUtc <= q.To.Value);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(l => l.CreatedAtUtc)
                .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
                .Select(l => new AuditLogResponseDto
                {
                    Id           = l.Id,
                    LogType      = l.LogType,
                    Action       = l.Action,
                    Description  = l.Description,
                    Detail       = l.Detail,
                    Username     = l.Username,
                    UserRole     = l.UserRole,
                    EntityType   = l.EntityType,
                    EntityId     = l.EntityId,
                    HttpMethod   = l.HttpMethod,
                    Endpoint     = l.Endpoint,
                    StatusCode   = l.StatusCode,
                    DurationMs   = l.DurationMs,
                    IsSuccess    = l.IsSuccess,
                    CreatedAtUtc = l.CreatedAtUtc,
                }).ToListAsync(ct);

            return new PagedAuditLogResult { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
        }

        private static string Truncate(string? value, int maxLength)
            => value is null ? string.Empty : value.Length <= maxLength ? value : value[..maxLength];

        private static string? TruncateNullable(string? value, int maxLength)
            => value is null ? null : value.Length <= maxLength ? value : value[..maxLength];
    }
}
