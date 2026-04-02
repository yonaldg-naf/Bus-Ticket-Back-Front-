using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class AnalyticsServiceTests
{
    private static AnalyticsService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db);

    // Seeds a full operator scenario with bookings and reviews
    private static (Guid operatorUserId, BusSchedule schedule) SeedFull(
        BusTicketBooking.Contexts.AppDbContext db,
        BookingStatus bookingStatus = BookingStatus.Confirmed,
        decimal amount = 500m)
    {
        var (op, bus, route, schedule) = SeedHelper.SeedSchedule(db,
            departure: DateTime.UtcNow.AddHours(-2)); // departed so we can add reviews

        var userId = Guid.NewGuid();
        var user = new User { Id = userId, Username = "cu_" + Guid.NewGuid().ToString()[..4], Email = "cu@t.com", FullName = "CU", Role = Roles.Customer, PasswordHash = "x" };
        db.Users.Add(user);

        var booking = SeedHelper.MakeBooking(userId, schedule.Id, bookingStatus, amount);
        db.Bookings.Add(booking);
        db.SaveChanges();

        return (op.UserId, schedule);
    }

    // ── GetOperatorAnalyticsAsync ─────────────────────────────────────────────

    [Fact]
    public async Task GetOperatorAnalytics_ReturnsEmpty_WhenOperatorNotFound()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.GetOperatorAnalyticsAsync(Guid.NewGuid(), 30);

        Assert.Equal(0, result.TotalBookings);
        Assert.Equal(0, result.TotalRevenue);
    }

    [Fact]
    public async Task GetOperatorAnalytics_CountsConfirmedAndCancelled()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule) = SeedFull(db, BookingStatus.Confirmed, 500m);

        // Add a cancelled booking to the same schedule
        var userId2 = Guid.NewGuid();
        var user2 = new User { Id = userId2, Username = "cu2_" + Guid.NewGuid().ToString()[..4], Email = "cu2@t.com", FullName = "CU2", Role = Roles.Customer, PasswordHash = "x" };
        db.Users.Add(user2);
        db.Bookings.Add(SeedHelper.MakeBooking(userId2, schedule.Id, BookingStatus.Cancelled, 500m));
        db.SaveChanges();

        var result = await svc.GetOperatorAnalyticsAsync(opUserId, 30);

        Assert.Equal(2, result.TotalBookings);
        Assert.Equal(1, result.ConfirmedBookings);
        Assert.Equal(1, result.CancelledBookings);
        Assert.Equal(500m, result.TotalRevenue);
    }

    [Fact]
    public async Task GetOperatorAnalytics_DailyRevenue_HasEntry_ForConfirmedBooking()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, _) = SeedFull(db, BookingStatus.Confirmed, 300m);

        var result = await svc.GetOperatorAnalyticsAsync(opUserId, 30);

        Assert.NotEmpty(result.DailyRevenue);
        Assert.Equal(300m, result.DailyRevenue.Sum(d => d.Revenue));
    }

    [Fact]
    public async Task GetOperatorAnalytics_TopRoutes_NotEmpty_WhenConfirmedBookingsExist()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, _) = SeedFull(db, BookingStatus.Confirmed, 400m);

        var result = await svc.GetOperatorAnalyticsAsync(opUserId, 30);

        Assert.NotEmpty(result.TopRoutes);
    }

    [Fact]
    public async Task GetOperatorAnalytics_AverageRating_IsZero_WhenNoReviews()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, _) = SeedFull(db, BookingStatus.Confirmed);

        var result = await svc.GetOperatorAnalyticsAsync(opUserId, 30);

        Assert.Equal(0, result.AverageRating);
        Assert.Equal(0, result.TotalReviews);
    }

    [Fact]
    public async Task GetOperatorAnalytics_AverageRating_CalculatedCorrectly_WhenReviewsExist()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule) = SeedFull(db, BookingStatus.Confirmed);

        var userId = Guid.NewGuid();
        var booking = SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        db.Reviews.Add(new Review { BookingId = booking.Id, UserId = userId, ScheduleId = schedule.Id, Rating = 4 });
        db.Reviews.Add(new Review { BookingId = Guid.NewGuid(), UserId = userId, ScheduleId = schedule.Id, Rating = 2 });
        db.SaveChanges();

        var result = await svc.GetOperatorAnalyticsAsync(opUserId, 30);

        Assert.Equal(3.0, result.AverageRating);
        Assert.Equal(2, result.TotalReviews);
    }

    // ── GetAllOperatorPerformanceAsync ────────────────────────────────────────

    [Fact]
    public async Task GetAllOperatorPerformance_ReturnsEmpty_WhenNoOperators()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = (await svc.GetAllOperatorPerformanceAsync()).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllOperatorPerformance_ReturnsOneEntry_PerOperator()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedFull(db, BookingStatus.Confirmed);

        var result = (await svc.GetAllOperatorPerformanceAsync()).ToList();

        Assert.Single(result);
    }

    [Fact]
    public async Task GetAllOperatorPerformance_CalculatesRevenue_ForConfirmedBookings()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedFull(db, BookingStatus.Confirmed, 750m);

        var result = (await svc.GetAllOperatorPerformanceAsync()).ToList();

        Assert.Equal(750m, result[0].TotalRevenue);
        Assert.Equal(1, result[0].ConfirmedBookings);
    }

    [Fact]
    public async Task GetAllOperatorPerformance_CancellationRate_IsCorrect()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, schedule) = SeedFull(db, BookingStatus.Confirmed, 500m);

        // Add a cancelled booking
        var userId2 = Guid.NewGuid();
        db.Users.Add(new User { Id = userId2, Username = "cx_" + Guid.NewGuid().ToString()[..4], Email = "cx@t.com", FullName = "CX", Role = Roles.Customer, PasswordHash = "x" });
        db.Bookings.Add(SeedHelper.MakeBooking(userId2, schedule.Id, BookingStatus.Cancelled, 500m));
        db.SaveChanges();

        var result = (await svc.GetAllOperatorPerformanceAsync()).ToList();

        // 1 cancelled out of 2 total = 50%
        Assert.Equal(50.0, result[0].CancellationRate);
    }

    [Fact]
    public async Task GetAllOperatorPerformance_OrderedByRevenue_Descending()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        // Operator 1 with high revenue
        SeedFull(db, BookingStatus.Confirmed, 1000m);
        // Operator 2 with low revenue
        SeedFull(db, BookingStatus.Confirmed, 100m);

        var result = (await svc.GetAllOperatorPerformanceAsync()).ToList();

        Assert.Equal(2, result.Count);
        Assert.True(result[0].TotalRevenue >= result[1].TotalRevenue);
    }

    // ── GetAdminSummaryAsync ──────────────────────────────────────────────────

    // Helper: read a property from an anonymous-type object via reflection
    private static T Prop<T>(object obj, string name)
        => (T)obj.GetType().GetProperty(name)!.GetValue(obj)!;

    [Fact]
    public async Task GetAdminSummary_ReturnsCorrectCounts()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        SeedFull(db, BookingStatus.Confirmed, 500m);

        var result = await svc.GetAdminSummaryAsync();

        Assert.True(Prop<int>(result, "totalBuses") >= 1);
        Assert.True(Prop<int>(result, "totalOperators") >= 1);
        Assert.True(Prop<int>(result, "totalBookings") >= 1);
        Assert.True(Prop<int>(result, "confirmedBookings") >= 1);
        Assert.True(Prop<decimal>(result, "totalRevenue") >= 500m);
    }

    [Fact]
    public async Task GetAdminSummary_ReturnsZeroCounts_WhenDatabaseIsEmpty()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.GetAdminSummaryAsync();

        Assert.Equal(0, Prop<int>(result, "totalBuses"));
        Assert.Equal(0, Prop<int>(result, "totalOperators"));
        Assert.Equal(0, Prop<int>(result, "totalBookings"));
        Assert.Equal(0m, Prop<decimal>(result, "totalRevenue"));
    }

    [Fact]
    public async Task GetAdminSummary_PendingApprovals_CountsOnlyPendingOperators()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        db.Users.Add(new User { Username = "pending1", Email = "p1@t.com", FullName = "P1", Role = Roles.PendingOperator, PasswordHash = "x" });
        db.Users.Add(new User { Username = "pending2", Email = "p2@t.com", FullName = "P2", Role = Roles.PendingOperator, PasswordHash = "x" });
        db.Users.Add(new User { Username = "customer1", Email = "c1@t.com", FullName = "C1", Role = Roles.Customer, PasswordHash = "x" });
        db.SaveChanges();

        var result = await svc.GetAdminSummaryAsync();

        Assert.Equal(2, Prop<int>(result, "pendingApprovals"));
    }

    [Fact]
    public async Task GetAdminSummary_RecentActivity_ReturnsAtMostNine()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        // Add 12 audit logs
        for (int i = 0; i < 12; i++)
            db.AuditLogs.Add(new AuditLog { LogType = "Audit", Action = "A" + i, Description = "D" + i, IsSuccess = true });
        db.SaveChanges();

        var result = await svc.GetAdminSummaryAsync();

        var activity = (System.Collections.IEnumerable)result.GetType().GetProperty("recentActivity")!.GetValue(result)!;
        int count = 0;
        foreach (var _ in activity) count++;
        Assert.True(count <= 9);
    }
}
