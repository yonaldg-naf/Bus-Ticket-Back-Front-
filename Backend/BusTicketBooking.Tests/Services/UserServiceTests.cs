using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Moq;

namespace BusTicketBooking.Tests.Services
{
    public class UserServiceTests
    {
        private UserService CreateService(out AppDbContext db, IPasswordService? passwords = null, string? dbName = null)
        {
            db = DbHelper.CreateDb(dbName ?? Guid.NewGuid().ToString());
            var pwd = passwords ?? new Mock<IPasswordService>().Object;
            return new UserService(new Repository<User>(db), pwd, db);
        }

        // ── FindByUsernameAsync ───────────────────────────────────────────────

        [Fact]
        public async Task FindByUsernameAsync_ExistingUser_ReturnsUser()
        {
            var svc = CreateService(out var db);
            db.Users.Add(new User { Username = "alice", Email = "alice@test.com" });
            await db.SaveChangesAsync();

            var result = await svc.FindByUsernameAsync("alice");

            Assert.NotNull(result);
            Assert.Equal("alice", result!.Username);
        }

        [Fact]
        public async Task FindByUsernameAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.FindByUsernameAsync("nobody");
            Assert.Null(result);
        }

        // ── FindByEmailAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task FindByEmailAsync_ExistingEmail_ReturnsUser()
        {
            var svc = CreateService(out var db);
            db.Users.Add(new User { Username = "alice", Email = "alice@test.com" });
            await db.SaveChangesAsync();

            var result = await svc.FindByEmailAsync("alice@test.com");

            Assert.NotNull(result);
            Assert.Equal("alice@test.com", result!.Email);
        }

        [Fact]
        public async Task FindByEmailAsync_NotFound_ReturnsNull()
        {
            var svc = CreateService(out _);
            var result = await svc.FindByEmailAsync("nobody@test.com");
            Assert.Null(result);
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_NewUser_HashesPasswordAndSaves()
        {
            var mockPwd = new Mock<IPasswordService>();
            mockPwd.Setup(p => p.Hash(It.IsAny<User>(), "pass123")).Returns("hashed");

            var svc = CreateService(out var db, mockPwd.Object);
            var user = new User { Username = "bob", Email = "bob@test.com" };

            var result = await svc.CreateAsync(user, "pass123");

            Assert.Equal("hashed", result.PasswordHash);
            Assert.Single(db.Users.ToList());
        }

        [Fact]
        public async Task CreateAsync_DuplicateUsername_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            db.Users.Add(new User { Username = "alice", Email = "alice@test.com" });
            await db.SaveChangesAsync();

            var newUser = new User { Username = "alice", Email = "other@test.com" };
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(newUser, "pass"));
        }

        [Fact]
        public async Task CreateAsync_DuplicateEmail_ThrowsInvalidOperationException()
        {
            var svc = CreateService(out var db);
            db.Users.Add(new User { Username = "alice", Email = "alice@test.com" });
            await db.SaveChangesAsync();

            var newUser = new User { Username = "other", Email = "alice@test.com" };
            await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CreateAsync(newUser, "pass"));
        }

        // ── GetUsersPagedAsync ────────────────────────────────────────────────

        [Fact]
        public async Task GetUsersPagedAsync_ReturnsAllUsers()
        {
            var svc = CreateService(out var db);
            db.Users.AddRange(
                new User { Username = "alice", Email = "alice@test.com", Role = "Customer" },
                new User { Username = "admin", Email = "admin@test.com", Role = "Admin" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetUsersPagedAsync(null, null, 1, 10);
            var total = (long)result.GetType().GetProperty("total")!.GetValue(result)!;

            Assert.Equal(2L, total);
        }

        [Fact]
        public async Task GetUsersPagedAsync_FilterByRole_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.Users.AddRange(
                new User { Username = "alice", Email = "alice@test.com", Role = "Customer" },
                new User { Username = "admin", Email = "admin@test.com", Role = "Admin" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetUsersPagedAsync("Admin", null, 1, 10);
            var total = (long)result.GetType().GetProperty("total")!.GetValue(result)!;

            Assert.Equal(1L, total);
        }

        [Fact]
        public async Task GetUsersPagedAsync_SearchByUsername_ReturnsFiltered()
        {
            var svc = CreateService(out var db);
            db.Users.AddRange(
                new User { Username = "alice", Email = "alice@test.com", Role = "Customer" },
                new User { Username = "bob", Email = "bob@test.com", Role = "Customer" }
            );
            await db.SaveChangesAsync();

            var result = await svc.GetUsersPagedAsync(null, "ali", 1, 10);
            var total = (long)result.GetType().GetProperty("total")!.GetValue(result)!;

            Assert.Equal(1L, total);
        }

        // ── ResetPasswordAsync ────────────────────────────────────────────────

        [Fact]
        public async Task ResetPasswordAsync_ExistingEmail_UpdatesHashReturnsTrue()
        {
            var mockPwd = new Mock<IPasswordService>();
            mockPwd.Setup(p => p.Hash(It.IsAny<User>(), "newpass")).Returns("newhash");

            var svc = CreateService(out var db, mockPwd.Object);
            db.Users.Add(new User { Username = "alice", Email = "alice@test.com", PasswordHash = "old" });
            await db.SaveChangesAsync();

            var result = await svc.ResetPasswordAsync("alice@test.com", "newpass");

            Assert.True(result);
            Assert.Equal("newhash", db.Users.First().PasswordHash);
        }

        [Fact]
        public async Task ResetPasswordAsync_UnknownEmail_ReturnsFalse()
        {
            var svc = CreateService(out _);
            var result = await svc.ResetPasswordAsync("nobody@test.com", "pass");
            Assert.False(result);
        }
    }
}
