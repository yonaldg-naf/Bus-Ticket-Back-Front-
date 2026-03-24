using System;
using System.Collections.Generic;

namespace BusTicketBooking.Dtos.Analytics
{
    public class DailyRevenueDto
    {
        public string Date { get; set; } = string.Empty; // yyyy-MM-dd
        public decimal Revenue { get; set; }
        public int Bookings { get; set; }
    }

    public class RoutePerformanceDto
    {
        public string RouteCode { get; set; } = string.Empty;
        public int TotalBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public double OccupancyRate { get; set; }
    }

    public class OperatorAnalyticsResponseDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalBookings { get; set; }
        public int ConfirmedBookings { get; set; }
        public int CancelledBookings { get; set; }
        public double AverageOccupancyRate { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public List<DailyRevenueDto> DailyRevenue { get; set; } = new();
        public List<RoutePerformanceDto> TopRoutes { get; set; } = new();
    }

    public class OperatorPerformanceDto
    {
        public Guid OperatorId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string OwnerName { get; set; } = string.Empty;
        public int TotalBuses { get; set; }
        public int TotalRoutes { get; set; }
        public int TotalSchedules { get; set; }
        public int TotalBookings { get; set; }
        public int ConfirmedBookings { get; set; }
        public decimal TotalRevenue { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public double CancellationRate { get; set; }
    }
}
