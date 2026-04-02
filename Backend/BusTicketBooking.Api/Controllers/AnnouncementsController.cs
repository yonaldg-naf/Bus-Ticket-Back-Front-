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
    public class AnnouncementsController : ControllerBase
    {
        private readonly IAnnouncementService _announcementService;

        public AnnouncementsController(IAnnouncementService announcementService) => _announcementService = announcementService;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        [Authorize(Roles = Roles.Operator)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto dto, CancellationToken ct)
        {
            var result = await _announcementService.CreateAsync(UserId, dto, ct);
            return CreatedAtAction(nameof(GetBySchedule), new { scheduleId = dto.ScheduleId }, result);
        }

        [HttpGet("schedule/{scheduleId:guid}")]
        public async Task<IActionResult> GetBySchedule(Guid scheduleId, CancellationToken ct)
        {
            var result = await _announcementService.GetByScheduleAsync(scheduleId, ct);
            return Ok(result);
        }

        [Authorize(Roles = Roles.Operator)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
        {
            var result = await _announcementService.GetMyAsync(UserId, ct);
            return Ok(result);
        }

        [Authorize(Roles = Roles.Operator)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            await _announcementService.DeleteAsync(UserId, id, ct);
            return NoContent();
        }
    }
}
