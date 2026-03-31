using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.AuditLogs;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.Admin)]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _logs;
        public AuditLogsController(IAuditLogService logs) => _logs = logs;

        /// <summary>POST /api/auditlogs/search — Admin only, paginated + filterable</summary>
        [HttpPost("search")]
        public async Task<IActionResult> GetLogs([FromBody] AuditLogQueryDto query, CancellationToken ct)
        {
            var result = await _logs.GetLogsAsync(query, ct);
            return Ok(result);
        }

        /// <summary>GET /api/auditlogs — Admin only, same as search with no filters</summary>
        [HttpGet]
        public async Task<IActionResult> GetLogsGet(
            [FromQuery] string? logType,
            [FromQuery] string? username,
            [FromQuery] string? entityType,
            [FromQuery] bool? isSuccess,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            CancellationToken ct = default)
        {
            var query = new AuditLogQueryDto
            {
                LogType = logType,
                Username = username,
                EntityType = entityType,
                IsSuccess = isSuccess,
                Page = page,
                PageSize = pageSize
            };
            var result = await _logs.GetLogsAsync(query, ct);
            return Ok(result);
        }
    }
}
