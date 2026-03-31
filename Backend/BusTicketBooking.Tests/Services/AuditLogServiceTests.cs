using BusTicketBooking.Dtos.AuditLogs;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Microsoft.Extensions.Logging.Abstractions;

namespace BusTicketBooking.Tests.Services;

public class AuditLogServiceTests
{
    private static AuditLogService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db, NullLogger<AuditLogService>.Instance);

    // ── LogAuditAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task LogAudit_SavesRecord_WithCorrectFields()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync(
            action: "Login",
            description: "User logged in",
            userId: Guid.NewGuid(),
            username: "alice",
            userRole: "Customer",
            entityType: "User",
            httpMethod: "POST",
            endpoint: "/api/auth/login",
            statusCode: 200,
            durationMs: 42,
            isSuccess: true);

        var log = db.AuditLogs.Single();
        Assert.Equal("Audit", log.LogType);
        Assert.Equal("Login", log.Action);
        Assert.Equal("User logged in", log.Description);
        Assert.Equal("alice", log.Username);
        Assert.Equal("Customer", log.UserRole);
        Assert.Equal("User", log.EntityType);
        Assert.Equal("POST", log.HttpMethod);
        Assert.Equal(200, log.StatusCode);
        Assert.Equal(42, log.DurationMs);
        Assert.True(log.IsSuccess);
    }

    [Fact]
    public async Task LogAudit_SavesRecord_WithMinimalFields()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync("SomeAction", "Some description");

        Assert.Single(db.AuditLogs);
        var log = db.AuditLogs.Single();
        Assert.Equal("Audit", log.LogType);
        Assert.Equal("SomeAction", log.Action);
        Assert.Null(log.Username);
        Assert.Null(log.UserId);
    }

    // ── LogErrorAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task LogError_SavesRecord_WithErrorLogType()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogErrorAsync(
            description: "Unhandled exception",
            detail: "NullReferenceException at line 42",
            username: "bob",
            endpoint: "/api/bookings",
            statusCode: 500);

        var log = db.AuditLogs.Single();
        Assert.Equal("Error", log.LogType);
        Assert.Equal("ERROR", log.Action);
        Assert.Equal("Unhandled exception", log.Description);
        Assert.Equal("NullReferenceException at line 42", log.Detail);
        Assert.Equal("bob", log.Username);
        Assert.Equal(500, log.StatusCode);
        Assert.False(log.IsSuccess);
    }

    [Fact]
    public async Task LogError_SavesRecord_WithMinimalFields()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogErrorAsync("Something went wrong");

        Assert.Single(db.AuditLogs);
        var log = db.AuditLogs.Single();
        Assert.Equal("Error", log.LogType);
        Assert.False(log.IsSuccess);
    }

    // ── GetLogsAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetLogs_ReturnsPaginatedResults()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        for (int i = 0; i < 5; i++)
            await svc.LogAuditAsync("Action" + i, "Desc" + i);

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 3 });

        Assert.Equal(5, result.TotalCount);
        Assert.Equal(3, result.Items.Count());
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.PageSize);
    }

    [Fact]
    public async Task GetLogs_FiltersByLogType()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync("A", "audit entry");
        await svc.LogErrorAsync("error entry");

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10, LogType = "Error" });

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Error", result.Items.Single().LogType);
    }

    [Fact]
    public async Task GetLogs_FiltersByUsername()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync("A", "desc", username: "alice");
        await svc.LogAuditAsync("B", "desc", username: "bob");

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10, Username = "alice" });

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("alice", result.Items.Single().Username);
    }

    [Fact]
    public async Task GetLogs_FiltersByIsSuccess()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync("A", "success", isSuccess: true);
        await svc.LogErrorAsync("failure");

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10, IsSuccess = false });

        Assert.Equal(1, result.TotalCount);
        Assert.False(result.Items.Single().IsSuccess);
    }

    [Fact]
    public async Task GetLogs_ReturnsEmpty_WhenNoLogs()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10 });

        Assert.Equal(0, result.TotalCount);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetLogs_FiltersByEntityType()
    {
        using var db = DbHelper.CreateDb();
        var svc = Build(db);

        await svc.LogAuditAsync("Create", "created bus", entityType: "Bus");
        await svc.LogAuditAsync("Create", "created user", entityType: "User");

        var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10, EntityType = "Bus" });

        Assert.Equal(1, result.TotalCount);
        Assert.Equal("Bus", result.Items.Single().EntityType);
    }
}
