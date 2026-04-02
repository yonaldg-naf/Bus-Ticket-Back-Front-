using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService) => _analyticsService = analyticsService;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Operator: full revenue analytics for their fleet.</summary>
        [Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
        [HttpGet("operator")]
        public async Task<IActionResult> GetOperatorAnalytics([FromQuery] int days = 30, CancellationToken ct = default)
        {
            var result = await _analyticsService.GetOperatorAnalyticsAsync(UserId, days, ct);
            return Ok(result);
        }

        /// <summary>Admin: performance metrics for all operators.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("operators")]
        public async Task<IActionResult> GetAllOperatorPerformance(CancellationToken ct)
        {
            var result = await _analyticsService.GetAllOperatorPerformanceAsync(ct);
            return Ok(result);
        }

        /// <summary>Admin dashboard summary.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("admin-summary")]
        public async Task<IActionResult> GetAdminSummary(CancellationToken ct)
        {
            var result = await _analyticsService.GetAdminSummaryAsync(ct);
            return Ok(result);
        }
    }
}
