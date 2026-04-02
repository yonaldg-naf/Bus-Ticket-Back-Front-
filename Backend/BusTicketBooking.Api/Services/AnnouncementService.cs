using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class AnnouncementService : IAnnouncementService
    {
        private readonly AppDbContext _db;

        public AnnouncementService(AppDbContext db) => _db = db;

        public async Task<object> CreateAsync(Guid operatorUserId, CreateAnnouncementDto dto, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct)
                ?? throw new ForbiddenException("Operator profile not found.");

            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == dto.ScheduleId, ct)
                ?? throw new NotFoundException("Schedule not found.");

            if (schedule.Bus?.OperatorId != op.Id)
                throw new ForbiddenException("You do not own this schedule.");

            var ann = new Announcement
            {
                ScheduleId = dto.ScheduleId,
                OperatorId = op.Id,
                Message    = dto.Message,
                Type       = dto.Type ?? "Info"
            };

            _db.Announcements.Add(ann);
            await _db.SaveChangesAsync(ct);

            return MapAnn(ann, schedule);
        }

        public async Task<IEnumerable<object>> GetByScheduleAsync(Guid scheduleId, CancellationToken ct = default)
        {
            var schedule = await _db.BusSchedules
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == scheduleId, ct);

            var anns = await _db.Announcements
                .AsNoTracking()
                .Where(a => a.ScheduleId == scheduleId)
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(ct);

            return anns.Select(a => MapAnn(a, schedule));
        }

        public async Task<IEnumerable<object>> GetMyAsync(Guid operatorUserId, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct);
            if (op is null) return Array.Empty<object>();

            var anns = await _db.Announcements
                .Include(a => a.Schedule).ThenInclude(s => s!.Bus)
                .Include(a => a.Schedule).ThenInclude(s => s!.Route)
                .AsNoTracking()
                .Where(a => a.OperatorId == op.Id)
                .OrderByDescending(a => a.CreatedAtUtc)
                .ToListAsync(ct);

            return anns.Select(a => MapAnn(a, a.Schedule));
        }

        public async Task<bool> DeleteAsync(Guid operatorUserId, Guid id, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct);

            var ann = await _db.Announcements.FirstOrDefaultAsync(a => a.Id == id, ct)
                ?? throw new NotFoundException("Announcement not found.");

            if (ann.OperatorId != op?.Id)
                throw new ForbiddenException("You do not own this announcement.");

            _db.Announcements.Remove(ann);
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static object MapAnn(Announcement a, BusSchedule? s) => new
        {
            id           = a.Id,
            scheduleId   = a.ScheduleId,
            busCode      = s?.Bus?.Code ?? "",
            routeCode    = s?.Route?.RouteCode ?? "",
            departureUtc = s?.DepartureUtc,
            message      = a.Message,
            type         = a.Type,
            createdAtUtc = a.CreatedAtUtc
        };
    }
}
