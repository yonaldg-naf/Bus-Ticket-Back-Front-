using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
        private readonly IOperatorApprovalService _approvalService;

        public OperatorApprovalController(IOperatorApprovalService approvalService) => _approvalService = approvalService;

        // GET /api/operator-approvals
        [HttpGet]
        public async Task<IActionResult> GetPending(CancellationToken ct)
        {
            var result = await _approvalService.GetPendingAsync(ct);
            return Ok(result);
        }

        // POST /api/operator-approvals/{id}/approve
        [HttpPost("{id:guid}/approve")]
        public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveOperatorDto dto, CancellationToken ct)
        {
            var result = await _approvalService.ApproveAsync(id, dto, ct);
            return Ok(result);
        }

        // POST /api/operator-approvals/{id}/reject
        [HttpPost("{id:guid}/reject")]
        public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
        {
            var result = await _approvalService.RejectAsync(id, ct);
            return Ok(result);
        }
    }
}
