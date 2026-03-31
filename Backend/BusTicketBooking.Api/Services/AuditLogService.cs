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
    /// Called automatically by AuditMiddleware for every API request,
    /// and can also be called directly from controllers for specific events.
    ///
    /// All write methods silently catch exceptions and log them — a failure
    /// to write an audit log should never crash the main request.
    /// </summary>
    public class AuditLogService : IAuditLogService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuditLogService> _logger;

        public AuditLogService(AppDbContext db, ILogger<AuditLogService> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Records a successful or failed API action to the audit log.
        /// Automatically called by AuditMiddleware after every API request.
        ///
        /// All string values are truncated to their database column limits before
        /// saving to prevent silent insert failures.
        ///
        /// If the database write fails for any reason, the error is logged
        /// but NOT re-thrown — audit failures must never break the main request.
        /// </summary>
        /// <param name="action">The HTTP method or action name (e.g. "POST", "DELETE").</param>
        /// <param name="description">Human-readable summary of what happened (e.g. "Created → /api/buses [201]").</param>
        /// <param name="userId">ID of the user who made the request (null for anonymous).</param>
        /// <param name="username">Username of the requester (null for anonymous).</param>
        /// <param name="userRole">Role of the requester (Admin / Operator / Customer).</param>
        /// <param name="entityType">The type of entity affected (e.g. "Bus", "Booking").</param>
        /// <param name="entityId">The ID of the specific entity affected (extracted from the URL).</param>
        /// <param name="httpMethod">The HTTP verb (GET, POST, PUT, PATCH, DELETE).</param>
        /// <param name="endpoint">The request path (e.g. "/api/bookings/abc123").</param>
        /// <param name="statusCode">The HTTP response status code (200, 201, 400, 500, etc.).</param>
        /// <param name="durationMs">How long the request took to complete in milliseconds.</param>
        /// <param name="isSuccess">True if the response was successful (status &lt; 400).</param>
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

        /// <summary>
        /// Records an unhandled exception or system error to the audit log.
        /// Called by AuditMiddleware when a request throws an unhandled exception.
        ///
        /// The full exception stack trace can be stored in the Detail field
        /// (up to 4000 characters) for debugging purposes.
        ///
        /// If the database write fails, the error is logged but NOT re-thrown.
        /// </summary>
        /// <param name="description">Short description of the error (e.g. "NullReferenceException: ...").</param>
        /// <param name="detail">Full exception stack trace or additional context (optional).</param>
        /// <param name="userId">ID of the user who triggered the error (null if anonymous).</param>
        /// <param name="username">Username of the requester (null if anonymous).</param>
        /// <param name="endpoint">The request path where the error occurred.</param>
        /// <param name="statusCode">The HTTP status code returned (typically 500).</param>
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

        /// <summary>
        /// Returns a paginated, filtered list of audit log entries for the admin dashboard.
        ///
        /// Supported filters (all optional):
        ///   - LogType    : "Audit" or "Error"
        ///   - Username   : partial match (contains search)
        ///   - EntityType : exact match (e.g. "Bus", "Booking")
        ///   - IsSuccess  : true for successful requests, false for failures
        ///   - From / To  : date range filter on CreatedAtUtc
        ///
        /// Results are always ordered newest-first.
        /// </summary>
        /// <param name="q">Query parameters including filters, page number, and page size.</param>
        /// <returns>A paged result containing matching log entries and the total count.</returns>
        public async Task<PagedAuditLogResult> GetLogsAsync(AuditLogQueryDto q, CancellationToken ct = default)
        {
            var query = _db.AuditLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.LogType))   query = query.Where(l => l.LogType == q.LogType);
            if (!string.IsNullOrWhiteSpace(q.Username))  query = query.Where(l => l.Username != null && l.Username.Contains(q.Username));
            if (!string.IsNullOrWhiteSpace(q.EntityType)) query = query.Where(l => l.EntityType == q.EntityType);
            if (q.IsSuccess.HasValue)                     query = query.Where(l => l.IsSuccess == q.IsSuccess.Value);
            if (q.From.HasValue)                          query = query.Where(l => l.CreatedAtUtc >= q.From.Value);
            if (q.To.HasValue)                            query = query.Where(l => l.CreatedAtUtc <= q.To.Value);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(l => l.CreatedAtUtc)
                .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
                .Select(l => new AuditLogResponseDto
                {
                    Id          = l.Id,
                    LogType     = l.LogType,
                    Action      = l.Action,
                    Description = l.Description,
                    Detail      = l.Detail,
                    Username    = l.Username,
                    UserRole    = l.UserRole,
                    EntityType  = l.EntityType,
                    EntityId    = l.EntityId,
                    HttpMethod  = l.HttpMethod,
                    Endpoint    = l.Endpoint,
                    StatusCode  = l.StatusCode,
                    DurationMs  = l.DurationMs,
                    IsSuccess   = l.IsSuccess,
                    CreatedAtUtc = l.CreatedAtUtc,
                }).ToListAsync(ct);

            return new PagedAuditLogResult { Items = items, TotalCount = total, Page = q.Page, PageSize = q.PageSize };
        }

        // ── Private helpers ───────────────────────────────────────────────────

        /// <summary>Truncates a required string to fit within a database column limit.</summary>
        private static string Truncate(string? value, int maxLength)
            => value is null ? string.Empty : value.Length <= maxLength ? value : value[..maxLength];

        /// <summary>Truncates an optional string to fit within a database column limit. Returns null if input is null.</summary>
        private static string? TruncateNullable(string? value, int maxLength)
            => value is null ? null : value.Length <= maxLength ? value : value[..maxLength];
    }
}
