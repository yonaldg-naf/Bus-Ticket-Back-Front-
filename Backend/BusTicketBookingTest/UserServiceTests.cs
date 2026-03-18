using Xunit;
using Microsoft.EntityFrameworkCore;
using BusTicketBooking.Contexts;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using BusTicketBooking.Interfaces;
using Moq;

namespace BusTicketBooking.Tests.Services
{
    public class UserServiceTests
    {
        private readonly AppDbContext _db;
        private readonly UserService _service;
        private readonly Mock<IPasswordService> _passwordServiceMock;

        public UserServiceTests()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _db = new AppDbContext(options);

            _passwordServiceMock = new Mock<IPasswordService>();
            _passwordServiceMock.Setup(p => p.Hash(It.IsAny<User>(), It.IsAny<string>()))
                                .Returns("hashed-pass");

            _service = new UserService(_db, _passwordServiceMock.Object);
        }

        [Fact]
        public async Task CreateUser_ShouldCreateSuccessfully()
        {
            // Arrange
            var user = new User
            {
                Username = "john",
                Email = "john@test.com"
            };

            // Act
            var result = await _service.CreateAsync(user, "password");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("john", result.Username);
            Assert.Equal("hashed-pass", result.PasswordHash);
        }

        [Fact]
        public async Task CreateUser_ShouldThrow_WhenUsernameExists()
        {
            // Arrange
            var existing = new User
            {
                Username = "john",
                Email = "old@test.com",
                PasswordHash = "x"
            };

            _db.Users.Add(existing);
            await _db.SaveChangesAsync();

            var user = new User
            {
                Username = "john",
                Email = "new@test.com"
            };

            // Act + Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreateAsync(user, "password")
            );
        }

        [Fact]
        public async Task CreateUser_ShouldThrow_WhenEmailExists()
        {
            // Arrange
            var existing = new User
            {
                Username = "user1",
                Email = "duplicate@test.com",
                PasswordHash = "x"
            };

            _db.Users.Add(existing);
            await _db.SaveChangesAsync();

            var user = new User
            {
                Username = "newuser",
                Email = "duplicate@test.com"
            };

            // Act + Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => _service.CreateAsync(user, "pass")
            );
        }

        [Fact]
        public async Task FindByUsername_ShouldReturnUser()
        {
            // Arrange
            var u = new User
            {
                Username = "searchme",
                Email = "a@a.com",
                PasswordHash = "x"
            };
            _db.Users.Add(u);
            await _db.SaveChangesAsync();

            // Act
            var result = await _service.FindByUsernameAsync("searchme");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("searchme", result.Username);
        }

        [Fact]
        public async Task FindByEmail_ShouldReturnUser()
        {
            // Arrange
            var u = new User
            {
                Username = "userA",
                Email = "find@test.com",
                PasswordHash = "x"
            };
            _db.Users.Add(u);
            await _db.SaveChangesAsync();

            // Act
            var result = await _service.FindByEmailAsync("find@test.com");

            // Assert
            Assert.NotNull(result);
            Assert.Equal("find@test.com", result.Email);
        }
    }
}