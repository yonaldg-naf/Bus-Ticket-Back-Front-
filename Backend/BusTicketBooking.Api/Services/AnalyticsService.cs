using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Analytics;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly AppDbContext _db;

        public AnalyticsService(AppDbContext db) => _db = db;

        public async Task<OperatorAnalyticsResponseDto> GetOperatorAnalyticsAsync(Guid operatorUserId, int days, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == operatorUserId, ct);
            if (op is null) return new OperatorAnalyticsResponseDto();

            var since = DateTime.UtcNow.AddDays(-days);

            var busIds = await _db.Buses.AsNoTracking()
                .Where(b => b.OperatorId == op.Id)
                .Select(b => b.Id).ToListAsync(ct);

            var schedules = await _db.BusSchedules.AsNoTracking()
                .Include(s => s.Bus)
                .Include(s => s.Route)
                .Where(s => busIds.Contains(s.BusId))
                .ToListAsync(ct);

            var scheduleIds = schedules.Select(s => s.Id).ToList();

            var bookings = await _db.Bookings.AsNoTracking()
                .Where(b => scheduleIds.Contains(b.ScheduleId) && b.CreatedAtUtc >= since)
                .ToListAsync(ct);

            var confirmedBookings = bookings.Where(b => b.Status == BookingStatus.Confirmed).ToList();
            var cancelledBookings = bookings.Where(b =>
                b.Status == BookingStatus.Cancelled || b.Status == BookingStatus.OperatorCancelled).ToList();

            var dailyRevenue = confirmedBookings
                .GroupBy(b => DateOnly.FromDateTime(b.CreatedAtUtc))
                .Select(g => new DailyRevenueDto
                {
                    Date     = g.Key.ToString("yyyy-MM-dd"),
                    Revenue  = g.Sum(b => b.TotalAmount),
                    Bookings = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToList();

            var routePerf = new List<RoutePerformanceDto>();
            foreach (var sched in schedules)
            {
                var schedBookings = confirmedBookings.Where(b => b.ScheduleId == sched.Id).ToList();
                if (!schedBookings.Any()) continue;

                var totalSeats = sched.Bus?.TotalSeats ?? 40;
                var occupancy  = totalSeats > 0 ? (double)schedBookings.Sum(b => b.Passengers?.Count ?? 1) / totalSeats * 100 : 0;

                var existing = routePerf.FirstOrDefault(r => r.RouteCode == (sched.Route?.RouteCode ?? ""));
                if (existing != null)
                {
                    existing.TotalBookings += schedBookings.Count;
                    existing.TotalRevenue  += schedBookings.Sum(b => b.TotalAmount);
                }
                else
                {
                    routePerf.Add(new RoutePerformanceDto
                    {
                        RouteCode     = sched.Route?.RouteCode ?? "Unknown",
                        TotalBookings = schedBookings.Count,
                        TotalRevenue  = schedBookings.Sum(b => b.TotalAmount),
                        OccupancyRate = Math.Round(occupancy, 1)
                    });
                }
            }

            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => scheduleIds.Contains(r.ScheduleId))
                .ToListAsync(ct);

            return new OperatorAnalyticsResponseDto
            {
                TotalRevenue          = confirmedBookings.Sum(b => b.TotalAmount),
                TotalBookings         = bookings.Count,
                ConfirmedBookings     = confirmedBookings.Count,
                CancelledBookings     = cancelledBookings.Count,
                AverageOccupancyRate  = schedules.Count > 0
                    ? Math.Round((double)confirmedBookings.Count / Math.Max(schedules.Sum(s => s.Bus?.TotalSeats ?? 40), 1) * 100, 1)
                    : 0,
                AverageRating         = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                TotalReviews          = reviews.Count,
                DailyRevenue          = dailyRevenue,
                TopRoutes             = routePerf.OrderByDescending(r => r.TotalRevenue).Take(5).ToList()
            };
        }

        public async Task<IEnumerable<OperatorPerformanceDto>> GetAllOperatorPerformanceAsync(CancellationToken ct = default)
        {
            var operators = await _db.BusOperators
                .Include(o => o.User)
                .Include(o => o.Buses)
                .Include(o => o.Routes)
                .AsNoTracking()
                .ToListAsync(ct);

            var result = new List<OperatorPerformanceDto>();

            foreach (var op in operators)
            {
                var busIds = op.Buses.Select(b => b.Id).ToList();

                var scheduleIds = await _db.BusSchedules.AsNoTracking()
                    .Where(s => busIds.Contains(s.BusId))
                    .Select(s => s.Id).ToListAsync(ct);

                var bookings = await _db.Bookings.AsNoTracking()
                    .Where(b => scheduleIds.Contains(b.ScheduleId))
                    .ToListAsync(ct);

                var confirmed  = bookings.Count(b => b.Status == BookingStatus.Confirmed);
                var cancelled  = bookings.Count(b => b.Status == BookingStatus.Cancelled || b.Status == BookingStatus.OperatorCancelled);

                var reviews = await _db.Reviews.AsNoTracking()
                    .Where(r => scheduleIds.Contains(r.ScheduleId))
                    .ToListAsync(ct);

                result.Add(new OperatorPerformanceDto
                {
                    OperatorId        = op.Id,
                    CompanyName       = op.CompanyName,
                    OwnerName         = op.User?.FullName ?? string.Empty,
                    TotalBuses        = op.Buses.Count,
                    TotalRoutes       = op.Routes.Count,
                    TotalSchedules    = scheduleIds.Count,
                    TotalBookings     = bookings.Count,
                    ConfirmedBookings = confirmed,
                    TotalRevenue      = bookings.Where(b => b.Status == BookingStatus.Confirmed).Sum(b => b.TotalAmount),
                    AverageRating     = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                    TotalReviews      = reviews.Count,
                    CancellationRate  = bookings.Count > 0 ? Math.Round((double)cancelled / bookings.Count * 100, 1) : 0
                });
            }

            return result.OrderByDescending(o => o.TotalRevenue);
        }

        public async Task<object> GetAdminSummaryAsync(CancellationToken ct = default)
        {
            var totalBuses = await _db.Buses.AsNoTracking().CountAsync(ct);
            var totalOperators = await _db.BusOperators.AsNoTracking().CountAsync(ct);
            var totalRoutes = await _db.BusRoutes.AsNoTracking().CountAsync(ct);
            var totalSchedules = await _db.BusSchedules.AsNoTracking().CountAsync(ct);
            var pendingApprovals = await _db.Users.AsNoTracking().CountAsync(u => u.Role == Roles.PendingOperator, ct);
            var totalUsers = await _db.Users.AsNoTracking().CountAsync(ct);
            var totalBookings = await _db.Bookings.AsNoTracking().CountAsync(ct);
            var confirmedBookings = await _db.Bookings.AsNoTracking().CountAsync(b => b.Status == BookingStatus.Confirmed, ct);

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
                totalOperators,
                totalRoutes,
                totalSchedules,
                pendingApprovals,
                totalUsers,
                totalBookings,
                confirmedBookings,
                totalRevenue = totalRevenue ?? 0m,
                recentActivity = recentLogs
            };
        }

        //public async Task<object> GetAdminSummaryAsync(CancellationToken ct = default)
        //{
        //    var totalBusesTask        = _db.Buses.AsNoTracking().CountAsync(ct);
        //    var totalOperatorsTask    = _db.BusOperators.AsNoTracking().CountAsync(ct);
        //    var totalRoutesTask       = _db.BusRoutes.AsNoTracking().CountAsync(ct);
        //    var totalSchedulesTask    = _db.BusSchedules.AsNoTracking().CountAsync(ct);
        //    var pendingApprovalsTask  = _db.Users.AsNoTracking().CountAsync(u => u.Role == Roles.PendingOperator, ct);
        //    var totalUsersTask        = _db.Users.AsNoTracking().CountAsync(ct);
        //    var totalBookingsTask     = _db.Bookings.AsNoTracking().CountAsync(ct);
        //    var confirmedBookingsTask = _db.Bookings.AsNoTracking().CountAsync(b => b.Status == BookingStatus.Confirmed, ct);
        //    var revenueTask           = _db.Bookings.AsNoTracking()
        //                                   .Where(b => b.Status == BookingStatus.Confirmed)
        //                                   .SumAsync(b => (decimal?)b.TotalAmount, ct);
        //    var recentLogsTask        = _db.AuditLogs.AsNoTracking()
        //                                   .OrderByDescending(l => l.CreatedAtUtc)
        //                                   .Take(5)
        //                                   .Select(l => new { l.Action, l.Description, l.Username, l.CreatedAtUtc, l.IsSuccess })
        //                                   .ToListAsync(ct);

        //    await Task.WhenAll(
        //        totalBusesTask, totalOperatorsTask, totalRoutesTask,
        //        totalSchedulesTask, pendingApprovalsTask, totalUsersTask,
        //        totalBookingsTask, confirmedBookingsTask, revenueTask, recentLogsTask);

        //    return new
        //    {
        //        totalBuses        = totalBusesTask.Result,
        //        totalOperators    = totalOperatorsTask.Result,
        //        totalRoutes       = totalRoutesTask.Result,
        //        totalSchedules    = totalSchedulesTask.Result,
        //        pendingApprovals  = pendingApprovalsTask.Result,
        //        totalUsers        = totalUsersTask.Result,
        //        totalBookings     = totalBookingsTask.Result,
        //        confirmedBookings = confirmedBookingsTask.Result,
        //        totalRevenue      = revenueTask.Result ?? 0m,
        //        recentActivity    = recentLogsTask.Result
        //    };
        //}
    }
}
