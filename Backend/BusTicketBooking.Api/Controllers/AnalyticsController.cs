using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Analytics;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AnalyticsController(AppDbContext db) => _db = db;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Operator: full revenue analytics for their fleet.</summary>
        [Authorize(Roles = Roles.Operator + "," + Roles.Admin)]
        [HttpGet("operator")]
        public async Task<IActionResult> GetOperatorAnalytics([FromQuery] int days = 30, CancellationToken ct = default)
        {
            var op = await _db.BusOperators.AsNoTracking().FirstOrDefaultAsync(o => o.UserId == UserId, ct);
            if (op is null) return Ok(new OperatorAnalyticsResponseDto());

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

            // Daily revenue (last N days)
            var dailyRevenue = confirmedBookings
                .GroupBy(b => DateOnly.FromDateTime(b.CreatedAtUtc))
                .Select(g => new DailyRevenueDto
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Revenue = g.Sum(b => b.TotalAmount),
                    Bookings = g.Count()
                })
                .OrderBy(d => d.Date)
                .ToList();

            // Top routes by revenue
            var routePerf = new List<RoutePerformanceDto>();
            foreach (var sched in schedules)
            {
                var schedBookings = confirmedBookings.Where(b => b.ScheduleId == sched.Id).ToList();
                if (!schedBookings.Any()) continue;

                var totalSeats = sched.Bus?.TotalSeats ?? 40;
                var occupancy = totalSeats > 0 ? (double)schedBookings.Sum(b => b.Passengers?.Count ?? 1) / totalSeats * 100 : 0;

                var existing = routePerf.FirstOrDefault(r => r.RouteCode == (sched.Route?.RouteCode ?? ""));
                if (existing != null)
                {
                    existing.TotalBookings += schedBookings.Count;
                    existing.TotalRevenue += schedBookings.Sum(b => b.TotalAmount);
                }
                else
                {
                    routePerf.Add(new RoutePerformanceDto
                    {
                        RouteCode = sched.Route?.RouteCode ?? "Unknown",
                        TotalBookings = schedBookings.Count,
                        TotalRevenue = schedBookings.Sum(b => b.TotalAmount),
                        OccupancyRate = Math.Round(occupancy, 1)
                    });
                }
            }

            // Reviews
            var reviews = await _db.Reviews.AsNoTracking()
                .Where(r => scheduleIds.Contains(r.ScheduleId))
                .ToListAsync(ct);

            return Ok(new OperatorAnalyticsResponseDto
            {
                TotalRevenue = confirmedBookings.Sum(b => b.TotalAmount),
                TotalBookings = bookings.Count,
                ConfirmedBookings = confirmedBookings.Count,
                CancelledBookings = cancelledBookings.Count,
                AverageOccupancyRate = schedules.Count > 0
                    ? Math.Round(
                        (double)confirmedBookings.Count /
                        Math.Max(schedules.Sum(s => s.Bus?.TotalSeats ?? 40), 1) * 100, 1)
                    : 0,
                AverageRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                TotalReviews = reviews.Count,
                DailyRevenue = dailyRevenue,
                TopRoutes = routePerf.OrderByDescending(r => r.TotalRevenue).Take(5).ToList()
            });
        }

        /// <summary>Admin: performance metrics for all operators.</summary>
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("operators")]
        public async Task<IActionResult> GetAllOperatorPerformance(CancellationToken ct)
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

                var confirmed = bookings.Count(b => b.Status == BookingStatus.Confirmed);
                var cancelled = bookings.Count(b =>
                    b.Status == BookingStatus.Cancelled || b.Status == BookingStatus.OperatorCancelled);

                var reviews = await _db.Reviews.AsNoTracking()
                    .Where(r => scheduleIds.Contains(r.ScheduleId))
                    .ToListAsync(ct);

                result.Add(new OperatorPerformanceDto
                {
                    OperatorId = op.Id,
                    CompanyName = op.CompanyName,
                    OwnerName = op.User?.FullName ?? string.Empty,
                    TotalBuses = op.Buses.Count,
                    TotalRoutes = op.Routes.Count,
                    TotalSchedules = scheduleIds.Count,
                    TotalBookings = bookings.Count,
                    ConfirmedBookings = confirmed,
                    TotalRevenue = bookings.Where(b => b.Status == BookingStatus.Confirmed).Sum(b => b.TotalAmount),
                    AverageRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0,
                    TotalReviews = reviews.Count,
                    CancellationRate = bookings.Count > 0 ? Math.Round((double)cancelled / bookings.Count * 100, 1) : 0
                });
            }

            return Ok(result.OrderByDescending(o => o.TotalRevenue));
        }
    }
}
