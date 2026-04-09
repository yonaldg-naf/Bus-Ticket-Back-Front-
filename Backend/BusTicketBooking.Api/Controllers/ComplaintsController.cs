using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Complaints;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ComplaintsController : ControllerBase
    {
        private readonly IComplaintService _complaintService;

        public ComplaintsController(IComplaintService complaintService) => _complaintService = complaintService;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Customer raises a complaint on a booking.</summary>
        [Authorize(Roles = Roles.Customer)]
        [HttpPost("booking/{bookingId:guid}")]
        public async Task<IActionResult> Raise([FromRoute] Guid bookingId, [FromBody] CreateComplaintRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _complaintService.RaiseAsync(UserId, bookingId, dto, ct);
            return Ok(result);
        }

        /// <summary>Customer: view their own complaints.</summary>
        [Authorize(Roles = Roles.Customer)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
            => Ok(await _complaintService.GetMyAsync(UserId, ct));

        /// <summary>Admin: view all complaints.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
            => Ok(await _complaintService.GetAllAsync(ct));

        /// <summary>Admin: reply to a complaint and mark it resolved.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpPatch("{id:guid}/reply")]
        public async Task<IActionResult> Reply([FromRoute] Guid id, [FromBody] ReplyComplaintRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _complaintService.ReplyAsync(id, dto, ct);
            return result is null ? NotFound() : Ok(result);
        }
    }
}
