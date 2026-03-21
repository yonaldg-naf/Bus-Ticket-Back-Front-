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

        /// <summary>GET /api/auditlogs — Admin only, paginated + filterable</summary>
        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] AuditLogQueryDto query, CancellationToken ct)
        {
            var result = await _logs.GetLogsAsync(query, ct);
            return Ok(result);
        }
    }
}
