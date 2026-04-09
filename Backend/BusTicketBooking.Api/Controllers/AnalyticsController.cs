using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.Admin)]
    public class AnalyticsController : ControllerBase
    {
        private readonly AnalyticsService _analyticsService;

        public AnalyticsController(AnalyticsService analyticsService) => _analyticsService = analyticsService;

        /// <summary>Admin dashboard summary.</summary>
        [HttpGet("admin-summary")]
        public async Task<IActionResult> GetAdminSummary(CancellationToken ct)
            => Ok(await _analyticsService.GetAdminSummaryAsync(ct));
    }
}
