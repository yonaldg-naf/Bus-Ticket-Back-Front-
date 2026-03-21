using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    /// <summary>
    /// Admin-only endpoints for managing pending operator applications.
    /// </summary>
    [ApiController]
    [Route("api/operator-approvals")]
    [Authorize(Roles = Roles.Admin)]
    public class OperatorApprovalController : ControllerBase
    {
        private readonly AppDbContext _db;

        public OperatorApprovalController(AppDbContext db) => _db = db;

        // GET /api/operator-approvals  — list all pending operators
        [HttpGet]
        public async Task<IActionResult> GetPending(CancellationToken ct)
        {
            var pending = await _db.Users
                .AsNoTracking()
                .Where(u => u.Role == Roles.PendingOperator)
                .OrderByDescending(u => u.CreatedAtUtc)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Role,
                    u.CreatedAtUtc,
                })
                .ToListAsync(ct);

            return Ok(pending);
        }

        // POST /api/operator-approvals/{id}/approve
        [HttpPost("{id:guid}/approve")]
        public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveOperatorDto dto, CancellationToken ct)
        {
            var user = await _db.Users.FindAsync(new object[] { id }, ct);
            if (user is null) return NotFound("User not found.");
            if (user.Role != Roles.PendingOperator)
                return BadRequest("User is not a pending operator.");

            // Promote to Operator
            user.Role = Roles.Operator;
            user.UpdatedAtUtc = DateTime.UtcNow;

            // Create BusOperator profile
            var profile = new BusOperator
            {
                UserId = user.Id,
                CompanyName = dto.CompanyName?.Trim() ?? user.FullName,
                SupportPhone = dto.SupportPhone?.Trim() ?? string.Empty,
            };
            _db.BusOperators.Add(profile);
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = $"{user.FullName} approved as operator.", userId = user.Id });
        }

        // POST /api/operator-approvals/{id}/reject
        [HttpPost("{id:guid}/reject")]
        public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
        {
            var user = await _db.Users.FindAsync(new object[] { id }, ct);
            if (user is null) return NotFound("User not found.");
            if (user.Role != Roles.PendingOperator)
                return BadRequest("User is not a pending operator.");

            // Downgrade to Customer
            user.Role = Roles.Customer;
            user.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = $"{user.FullName}'s operator request was rejected." });
        }
    }

    public class ApproveOperatorDto
    {
        public string? CompanyName { get; set; }
        public string? SupportPhone { get; set; }
    }
}