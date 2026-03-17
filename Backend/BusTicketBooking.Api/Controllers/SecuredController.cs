using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BusTicketBooking.Models;

namespace BusTicketBooking.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SecuredController : ControllerBase
    {
        // Admin-only test endpoint
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("admin/ping")]
        public IActionResult AdminPing() => Ok(new { message = "Hello Admin! 🔐" });

        // Operator-only test endpoint
        [Authorize(Roles = Roles.Operator)]
        [HttpGet("operator/ping")]
        public IActionResult OperatorPing() => Ok(new { message = "Hello Operator! 🚌" });

        // Any authenticated user
        [Authorize]
        [HttpGet("me")]
        public IActionResult Me() => Ok(new
        {
            name = User.Identity?.Name,
            role = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value
        });
    }
}