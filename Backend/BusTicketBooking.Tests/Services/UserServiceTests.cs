using BusTicketBooking.Models;
using BusTicketBooking.Repositories;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Moq;
using BusTicketBooking.Interfaces;

namespace BusTicketBooking.Tests.Services
{
    public class UserServiceTests
    {
        private static (UserService svc, Mock<IPasswordService> pwdMock) Build(
            BusTicketBooking.Contexts.AppDbContext db)
        {
            var pwdMock = new Mock<IPasswordService>();
            pwdMock.Setup(p => p.Hash(It.IsAny<User>(), It.IsAny<string>()))
                   .Returns("hashed_password");
            return (new UserService(new Repository<User>(db), pwdMock.Object), pwdMock);
        }

        // ── FindByUsernameAsync ───────────────────────────────────────────────

        [Fact]
        public async Task FindByUsername_ReturnsUser_WhenExists()
        {
            using var db = DbHelper.CreateDb();
            var user = SeedHelper.MakeUser();
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var (svc, _) = Build(db);
            var found    = await svc.FindByUsernameAsync(user.Username);

            Assert.NotNull(found);
            Assert.Equal(user.Id, found!.Id);
        }

        [Fact]
        public async Task FindByUsername_ReturnsNull_WhenNotFound()
        {
            using var db = DbHelper.CreateDb();
            var (svc, _) = Build(db);
            var found    = await svc.FindByUsernameAsync("nobody");
            Assert.Null(found);
        }

        // ── FindByEmailAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task FindByEmail_ReturnsUser_WhenExists()
        {
            using var db = DbHelper.CreateDb();
            var user = SeedHelper.MakeUser();
            db.Users.Add(user);
            await db.SaveChangesAsync();

            var (svc, _) = Build(db);
            var found    = await svc.FindByEmailAsync(user.Email);

            Assert.NotNull(found);
            Assert.Equal(user.Id, found!.Id);
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task Create_SavesUser_WithHashedPassword()
        {
            using var db = DbHelper.CreateDb();
            var (svc, pwdMock) = Build(db);

            var newUser = new User
            {
                Username = "newuser",
                Email    = "new@example.com",
                FullName = "New User",
                Role     = Roles.Customer
            };

            var created = await svc.CreateAsync(newUser, "plainpassword");

            Assert.Equal("hashed_password", created.PasswordHash);
            Assert.Single(db.Users);
            pwdMock.Verify(p => p.Hash(It.IsAny<User>(), "plainpassword"), Times.Once);
        }

        [Fact]
        public async Task Create_Throws_WhenUsernameAlreadyTaken()
        {
            using var db = DbHelper.CreateDb();
            var existing = SeedHelper.MakeUser();
            existing.Username = "duplicate";
            db.Users.Add(existing);
            await db.SaveChangesAsync();

            var (svc, _) = Build(db);
            var newUser  = new User
            {
                Username = "duplicate",
                Email    = "other@example.com",
                FullName = "Other",
                Role     = Roles.Customer
            };

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.CreateAsync(newUser, "pass"));
        }

        [Fact]
        public async Task Create_Throws_WhenEmailAlreadyRegistered()
        {
            using var db = DbHelper.CreateDb();
            var existing = SeedHelper.MakeUser();
            existing.Email = "taken@example.com";
            db.Users.Add(existing);
            await db.SaveChangesAsync();

            var (svc, _) = Build(db);
            var newUser  = new User
            {
                Username = "brandnew",
                Email    = "taken@example.com",
                FullName = "Brand New",
                Role     = Roles.Customer
            };

            await Assert.ThrowsAsync<InvalidOperationException>(
                () => svc.CreateAsync(newUser, "pass"));
        }
    }
}
