using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.AuditLogs;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Microsoft.Extensions.Logging.Abstractions;

namespace BusTicketBooking.Tests.Services
{
    public class AuditLogServiceTests
    {
        private AuditLogService CreateService(out AppDbContext db, string? dbName = null)
        {
            db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            return new AuditLogService(new Repository<AuditLog>(db), db, NullLogger<AuditLogService>.Instance);
        }

        // ── LogAuditAsync ─────────────────────────────────────────────────────

        [Fact]
        public async Task LogAuditAsync_WritesAuditLogEntry()
        {
            var svc = CreateService(out var db);

            await svc.LogAuditAsync("CREATE", "Created a bus", userId: Guid.NewGuid(), username: "admin");

            Assert.Single(db.AuditLogs.ToList());
            var log = db.AuditLogs.First();
            Assert.Equal("Audit", log.LogType);
            Assert.Equal("CREATE", log.Action);
            Assert.Equal("Created a bus", log.Description);
            Assert.True(log.IsSuccess);
        }

        [Fact]
        public async Task LogAuditAsync_TruncatesLongAction()
        {
            var svc = CreateService(out var db);
            var longAction = new string('A', 100); // exceeds 50 char limit

            await svc.LogAuditAsync(longAction, "desc");

            Assert.Equal(50, db.AuditLogs.First().Action.Length);
        }

        [Fact]
        public async Task LogAuditAsync_TruncatesLongDescription()
        {
            var svc = CreateService(out var db);
            var longDesc = new string('D', 600); // exceeds 500 char limit

            await svc.LogAuditAsync("ACT", longDesc);

            Assert.Equal(500, db.AuditLogs.First().Description.Length);
        }

        [Fact]
        public async Task LogAuditAsync_IsSuccessFalse_SetsCorrectly()
        {
            var svc = CreateService(out var db);

            await svc.LogAuditAsync("DELETE", "Failed delete", isSuccess: false);

            Assert.False(db.AuditLogs.First().IsSuccess);
        }

        [Fact]
        public async Task LogAuditAsync_SetsAllOptionalFields()
        {
            var svc = CreateService(out var db);
            var userId = Guid.NewGuid();

            await svc.LogAuditAsync(
                "UPDATE", "Updated bus",
                userId: userId, username: "admin", userRole: "Admin",
                entityType: "Bus", entityId: "abc123",
                httpMethod: "PUT", endpoint: "/api/buses/1",
                statusCode: 200, durationMs: 42);

            var log = db.AuditLogs.First();
            Assert.Equal(userId, log.UserId);
            Assert.Equal("admin", log.Username);
            Assert.Equal("Admin", log.UserRole);
            Assert.Equal("Bus", log.EntityType);
            Assert.Equal("abc123", log.EntityId);
            Assert.Equal("PUT", log.HttpMethod);
            Assert.Equal("/api/buses/1", log.Endpoint);
            Assert.Equal(200, log.StatusCode);
            Assert.Equal(42, log.DurationMs);
        }

        // ── LogErrorAsync ─────────────────────────────────────────────────────

        [Fact]
        public async Task LogErrorAsync_WritesErrorLogEntry()
        {
            var svc = CreateService(out var db);

            await svc.LogErrorAsync("Something went wrong", detail: "Stack trace here");

            Assert.Single(db.AuditLogs.ToList());
            var log = db.AuditLogs.First();
            Assert.Equal("Error", log.LogType);
            Assert.Equal("ERROR", log.Action);
            Assert.False(log.IsSuccess);
            Assert.Equal("Stack trace here", log.Detail);
        }

        [Fact]
        public async Task LogErrorAsync_TruncatesLongDetail()
        {
            var svc = CreateService(out var db);
            var longDetail = new string('X', 5000); // exceeds 4000 char limit

            await svc.LogErrorAsync("Error", detail: longDetail);

            Assert.Equal(4000, db.AuditLogs.First().Detail!.Length);
        }

        // ── GetLogsAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task GetLogsAsync_ReturnsAllLogs()
        {
            var svc = CreateService(out var db);
            db.AuditLogs.AddRange(
                new AuditLog { LogType = "Audit", Action = "CREATE", Description = "d1", IsSuccess = true },
                new AuditLog { LogType = "Error", Action = "ERROR", Description = "d2", IsSuccess = false }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 1, PageSize = 10 });

            Assert.Equal(2, result.TotalCount);
            Assert.Equal(2, result.Items.Count());
        }

        [Fact]
        public async Task GetLogsAsync_FilterByLogType_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.AuditLogs.AddRange(
                new AuditLog { LogType = "Audit", Action = "CREATE", Description = "d1" },
                new AuditLog { LogType = "Error", Action = "ERROR", Description = "d2" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { LogType = "Error", Page = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Error", result.Items.First().LogType);
        }

        [Fact]
        public async Task GetLogsAsync_FilterByIsSuccess_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.AuditLogs.AddRange(
                new AuditLog { LogType = "Audit", Action = "A", Description = "d", IsSuccess = true },
                new AuditLog { LogType = "Audit", Action = "B", Description = "d", IsSuccess = false }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { IsSuccess = false, Page = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
        }

        [Fact]
        public async Task GetLogsAsync_Pagination_ReturnsCorrectPage()
        {
            var svc = CreateService(out var db);
            for (int i = 0; i < 5; i++)
                db.AuditLogs.Add(new AuditLog { LogType = "Audit", Action = $"A{i}", Description = "d" });
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { Page = 2, PageSize = 2 });

            Assert.Equal(5, result.TotalCount);
            Assert.Equal(2, result.Items.Count());
        }

        [Fact]
        public async Task GetLogsAsync_FilterByUsername_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.AuditLogs.AddRange(
                new AuditLog { LogType = "Audit", Action = "A", Description = "d", Username = "alice" },
                new AuditLog { LogType = "Audit", Action = "B", Description = "d", Username = "bob" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { Username = "alice", Page = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
        }

        [Fact]
        public async Task GetLogsAsync_FilterByEntityType_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.AuditLogs.AddRange(
                new AuditLog { LogType = "Audit", Action = "A", Description = "d", EntityType = "Bus" },
                new AuditLog { LogType = "Audit", Action = "B", Description = "d", EntityType = "Route" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetLogsAsync(new AuditLogQueryDto { EntityType = "Bus", Page = 1, PageSize = 10 });

            Assert.Equal(1, result.TotalCount);
        }
    }
}
