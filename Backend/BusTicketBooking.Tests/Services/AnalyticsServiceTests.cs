using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class AnalyticsServiceTests
{
    private static AnalyticsService Build(BusTicketBooking.Contexts.AppDbContext db) => new(db);

    // Helper: read a property from an anonymous-type object via reflection
    private static T Prop<T>(object obj, string name)
        => (T)obj.GetType().GetProperty(name)!.GetValue(obj)!;

    [Fact]
    public async Task GetAdminSummary_ReturnsCorrectCounts()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, bus, route, schedule) = SeedHelper.SeedSchedule(db);
        var userId = Guid.NewGuid();
        db.Users.Add(new User { Id = userId, Username = "cu_" + Guid.NewGuid().ToString()[..4], Email = "cu@t.com", FullName = "CU", Role = Roles.Customer, PasswordHash = "x" });
        db.Bookings.Add(SeedHelper.MakeBooking(userId, schedule.Id, BookingStatus.Confirmed, 500m));
        db.SaveChanges();

        var result = await svc.GetAdminSummaryAsync();

        Assert.True(Prop<int>(result, "totalBuses") >= 1);
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
        Assert.Equal(0, Prop<int>(result, "totalBookings"));
        Assert.Equal(0m, Prop<decimal>(result, "totalRevenue"));
    }

    [Fact]
    public async Task GetAdminSummary_RecentActivity_ReturnsAtMostNine()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

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
