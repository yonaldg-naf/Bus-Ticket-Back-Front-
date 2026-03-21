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
    /// Logs every POST/PUT/PATCH/DELETE to AuditLogs table.
    /// Captures unhandled exceptions as Error logs.
    /// Must be registered AFTER UseCors, BEFORE UseAuthentication.
    /// </summary>
    public class AuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditMiddleware> _logger;

        public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext ctx)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                await _next(ctx);
                sw.Stop();

                var method = ctx.Request.Method;
                if (ctx.Request.Path.StartsWithSegments("/api") &&
                    method is "POST" or "PUT" or "PATCH" or "DELETE")
                {
                    await WriteAuditAsync(ctx, sw.ElapsedMilliseconds);
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Unhandled exception on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
                await WriteErrorAsync(ctx, ex, sw.ElapsedMilliseconds);
                throw;
            }
        }

        private static async Task WriteAuditAsync(HttpContext ctx, long ms)
        {
            var svc = ctx.RequestServices.GetService<IAuditLogService>();
            if (svc is null) return;

            var userId = GetUserId(ctx);
            var username = ctx.User.Identity?.Name;
            var role = ctx.User.FindFirstValue(ClaimTypes.Role) ?? ctx.User.FindFirstValue("role");
            var path = ctx.Request.Path.Value ?? string.Empty;
            var method = ctx.Request.Method;
            var status = ctx.Response.StatusCode;

            await svc.LogAuditAsync(
                action: method,
                description: $"{VerbLabel(method)} → {path} [{status}]",
                userId: userId, username: username, userRole: role,
                entityType: InferEntity(path), entityId: InferId(path),
                httpMethod: method, endpoint: path,
                statusCode: status, durationMs: ms, isSuccess: status < 400);
        }

        private static async Task WriteErrorAsync(HttpContext ctx, Exception ex, long ms)
        {
            var svc = ctx.RequestServices.GetService<IAuditLogService>();
            if (svc is null) return;
            await svc.LogErrorAsync(
                description: $"{ex.GetType().Name}: {ex.Message}",
                detail: ex.ToString(),
                userId: GetUserId(ctx),
                username: ctx.User.Identity?.Name,
                endpoint: ctx.Request.Path.Value,
                statusCode: 500);
        }

        private static Guid? GetUserId(HttpContext ctx)
        {
            var raw = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ctx.User.FindFirstValue("sub");
            return Guid.TryParse(raw, out var id) ? id : null;
        }

        private static string VerbLabel(string m) => m switch
        {
            "POST" => "Created",
            "PUT" => "Updated",
            "PATCH" => "Patched",
            "DELETE" => "Deleted",
            _ => m
        };

        private static string? InferEntity(string path)
        {
            if (path.Contains("/buses")) return "Bus";
            if (path.Contains("/routes")) return "Route";
            if (path.Contains("/schedules")) return "Schedule";
            if (path.Contains("/bookings")) return "Booking";
            if (path.Contains("/stops")) return "Stop";
            if (path.Contains("/auth")) return "Auth";
            return null;
        }

        private static string? InferId(string path)
        {
            var last = path.TrimEnd('/').Split('/')[^1];
            return Guid.TryParse(last, out _) ? last : null;
        }
    }
}
