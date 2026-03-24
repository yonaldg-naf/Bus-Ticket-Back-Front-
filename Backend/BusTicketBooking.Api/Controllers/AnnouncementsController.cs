using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnnouncementsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AnnouncementsController(AppDbContext db) => _db = db;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        [Authorize(Roles = Roles.Operator)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto dto, CancellationToken ct)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Forbid();

            var schedule = await _db.BusSchedules.Include(s => s.Bus).Include(s => s.Route)
                .AsNoTracking().FirstOrDefaultAsync(s => s.Id == dto.ScheduleId, ct);
            if (schedule is null) return NotFound("Schedule not found.");

            // Verify operator owns this schedule
            if (schedule.Bus?.OperatorId != op.Id) return Forbid();

            var ann = new Announcement
            {
                ScheduleId = dto.ScheduleId,
                OperatorId = op.Id,
                Message = dto.Message,
                Type = dto.Type ?? "Info"
            };

            _db.Announcements.Add(ann);
            await _db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetBySchedule), new { scheduleId = ann.ScheduleId },
                MapAnn(ann, schedule));
        }

        [HttpGet("schedule/{scheduleId:guid}")]
        public async Task<IActionResult> GetBySchedule(Guid scheduleId, CancellationToken ct)
        {
            var schedule = await _db.BusSchedules.Include(s => s.Bus).Include(s => s.Route)
                .AsNoTracking().FirstOrDefaultAsync(s => s.Id == scheduleId, ct);

            var anns = await _db.Announcements.AsNoTracking()
                .Where(a => a.ScheduleId == scheduleId)
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(ct);

            return Ok(anns.Select(a => MapAnn(a, schedule)));
        }

        [Authorize(Roles = Roles.Operator)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy(CancellationToken ct)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Ok(Array.Empty<object>());

            var anns = await _db.Announcements
                .Include(a => a.Schedule).ThenInclude(s => s!.Bus)
                .Include(a => a.Schedule).ThenInclude(s => s!.Route)
                .AsNoTracking()
                .Where(a => a.OperatorId == op.Id)
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(ct);

            return Ok(anns.Select(a => MapAnn(a, a.Schedule)));
        }

        [Authorize(Roles = Roles.Operator)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            var ann = await _db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct);
            if (ann is null) return NotFound();
            if (ann.OperatorId != op?.Id) return Forbid();

            _db.Announcements.Remove(ann);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        private static object MapAnn(Announcement a, BusSchedule? s) => new
        {
            id = a.Id,
            scheduleId = a.ScheduleId,
            busCode = s?.Bus?.Code ?? "",
            routeCode = s?.Route?.RouteCode ?? "",
            departureUtc = s?.DepartureUtc,
            message = a.Message,
            type = a.Type,
            createdAtUtc = a.CreatedAtUtc
        };
    }

    public class CreateAnnouncementDto
    {
        public Guid ScheduleId { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Type { get; set; }
    }
}
