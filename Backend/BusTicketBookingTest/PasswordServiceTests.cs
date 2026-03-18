using Xunit;
using BusTicketBooking.Services;
using BusTicketBooking.Models;

namespace BusTicketBooking.Tests.Services
{
    public class PasswordServiceTests
    {
        private readonly PasswordService _service;

        public PasswordServiceTests()
        {
            _service = new PasswordService();
        }

        [Fact]
        public void Hash_ShouldReturnHashedString()
        {
            // Arrange
            var user = new User { Username = "testuser" };
            var password = "mypassword123";

            // Act
            var hash = _service.Hash(user, password);

            // Assert
            Assert.NotNull(hash);
            Assert.NotEqual(password, hash); // should not return plain password
        }

        [Fact]
        public void Verify_ShouldReturnTrue_ForCorrectPassword()
        {
            // Arrange
            var user = new User { Username = "testuser" };
            var password = "mypassword";

            user.PasswordHash = _service.Hash(user, password);

            // Act
            var result = _service.Verify(user, password);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public void Verify_ShouldReturnFalse_ForIncorrectPassword()
        {
            // Arrange
            var user = new User { Username = "testuser" };
            var password = "mypassword";

            user.PasswordHash = _service.Hash(user, password);

            // Act
            var result = _service.Verify(user, "wrongpassword");

            // Assert
            Assert.False(result);
        }
    }
}