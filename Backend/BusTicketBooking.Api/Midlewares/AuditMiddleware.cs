using System;
using System.Diagnostics;
using System.Security.Claims;
using System.Threading.Tasks;
using BusTicketBooking.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BusTicketBooking.Middlewares
{
    /// <summary>
    /// Logs every API request to AuditLogs table.
    /// Uses a fresh DI scope so the audit write never conflicts with the
    /// request's own DbContext scope (which may already be disposed/dirty).
    /// Registered AFTER UseAuthentication so ctx.User is populated.
    /// </summary>
    public class AuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditMiddleware> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public AuditMiddleware(RequestDelegate next,
                               ILogger<AuditMiddleware> logger,
                               IServiceScopeFactory scopeFactory)
        {
            _next = next;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        public async Task InvokeAsync(HttpContext ctx)
        {
            var sw = Stopwatch.StartNew();
            Exception? caught = null;

            try
            {
                await _next(ctx);
            }
            catch (Exception ex)
            {
                caught = ex;
                sw.Stop();
                _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                    ctx.Request.Method, ctx.Request.Path);
                await WriteAsync(ctx, sw.ElapsedMilliseconds, ex);
                throw;
            }

            sw.Stop();

            if (ctx.Request.Path.StartsWithSegments("/api"))
                await WriteAsync(ctx, sw.ElapsedMilliseconds, null);
        }

        private async Task WriteAsync(HttpContext ctx, long ms, Exception? ex)
        {
            try
            {
                // Fresh scope — completely independent from the request's scope
                await using var scope = _scopeFactory.CreateAsyncScope();
                var svc = scope.ServiceProvider.GetRequiredService<IAuditLogService>();

                var userId   = GetUserId(ctx);
                var username = ctx.User.Identity?.Name
                               ?? ctx.User.FindFirstValue("unique_name")
                               ?? ctx.User.FindFirstValue(ClaimTypes.Name);
                var role     = ctx.User.FindFirstValue(ClaimTypes.Role)
                               ?? ctx.User.FindFirstValue("role");
                var path     = ctx.Request.Path.Value ?? string.Empty;
                var method   = ctx.Request.Method;
                var status   = ex is null ? ctx.Response.StatusCode : 500;

                if (ex is not null)
                {
                    await svc.LogErrorAsync(
                        description: $"{ex.GetType().Name}: {ex.Message}",
                        detail: ex.ToString(),
                        userId: userId,
                        username: username,
                        endpoint: path,
                        statusCode: status);
                }
                else
                {
                    await svc.LogAuditAsync(
                        action: method,
                        description: $"{VerbLabel(method)} → {path} [{status}]",
                        userId: userId, username: username, userRole: role,
                        entityType: InferEntity(path), entityId: InferId(path),
                        httpMethod: method, endpoint: path,
                        statusCode: status, durationMs: ms,
                        isSuccess: status < 400);
                }
            }
            catch (Exception logEx)
            {
                _logger.LogWarning(logEx, "AuditMiddleware failed to write log entry.");
            }
        }

        private static Guid? GetUserId(HttpContext ctx)
        {
            var raw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
                   ?? ctx.User.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private static string VerbLabel(string m) => m switch
        {
            "POST"   => "Created",
            "PUT"    => "Updated",
            "PATCH"  => "Patched",
            "DELETE" => "Deleted",
            "GET"    => "Read",
            _        => m
        };

        private static string? InferEntity(string path)
        {
            if (path.Contains("/buses"))      return "Bus";
            if (path.Contains("/routes"))     return "Route";
            if (path.Contains("/schedules"))  return "Schedule";
            if (path.Contains("/bookings"))   return "Booking";
            if (path.Contains("/stops"))      return "Stop";
            if (path.Contains("/auth"))       return "Auth";
            if (path.Contains("/auditlogs"))  return "AuditLog";
            if (path.Contains("/wallet"))     return "Wallet";
            if (path.Contains("/complaints")) return "Complaint";
            if (path.Contains("/promocodes")) return "PromoCode";
            return null;
        }

        private static string? InferId(string path)
        {
            var last = path.TrimEnd('/').Split('/')[^1];
            return Guid.TryParse(last, out _) ? last : null;
        }
    }
}
