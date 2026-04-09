using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class AnalyticsService
    {
        private readonly AppDbContext _db;

        public AnalyticsService(AppDbContext db) => _db = db;

        public async Task<object> GetAdminSummaryAsync(CancellationToken ct = default)
        {
            var totalBuses     = await _db.Buses.AsNoTracking().CountAsync(ct);
            var totalRoutes    = await _db.BusRoutes.AsNoTracking().CountAsync(ct);
            var totalSchedules = await _db.BusSchedules.AsNoTracking().CountAsync(ct);
            var totalUsers     = await _db.Users.AsNoTracking().CountAsync(ct);
            var totalBookings  = await _db.Bookings.AsNoTracking().CountAsync(ct);

            var confirmedBookings = await _db.Bookings.AsNoTracking()
                .CountAsync(b => b.Status == BookingStatus.Confirmed, ct);

            var totalRevenue = await _db.Bookings.AsNoTracking()
                .Where(b => b.Status == BookingStatus.Confirmed)
                .SumAsync(b => (decimal?)b.TotalAmount, ct);

            var recentLogs = await _db.AuditLogs.AsNoTracking()
                .OrderByDescending(l => l.CreatedAtUtc)
                .Take(9)
                .Select(l => new { l.Action, l.Description, l.Username, l.CreatedAtUtc, l.IsSuccess })
                .ToListAsync(ct);

            return new
            {
                totalBuses,
                totalRoutes,
                totalSchedules,
                totalUsers,
                totalBookings,
                confirmedBookings,
                totalRevenue = totalRevenue ?? 0m,
                recentActivity = recentLogs
            };
        }
    }
}
