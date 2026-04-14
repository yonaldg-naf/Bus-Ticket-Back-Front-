using BusTicketBooking.Models;
using BusTicketBooking.Services;

namespace BusTicketBooking.Tests.Services
{
    public class PasswordServiceTests
    {
        private readonly PasswordService _svc = new();
        private readonly User _user = new() { Username = "testuser", Email = "test@test.com" };

        [Fact]
        public void Hash_ReturnsNonEmptyString()
        {
            var hash = _svc.Hash(_user, "password123");
            Assert.False(string.IsNullOrWhiteSpace(hash));
        }

        [Fact]
        public void Hash_SamePasswordProducesDifferentHashes()
        {
            var hash1 = _svc.Hash(_user, "password123");
            var hash2 = _svc.Hash(_user, "password123");
            // PBKDF2 uses random salt — hashes should differ
            Assert.NotEqual(hash1, hash2);
        }

        [Fact]
        public void Verify_CorrectPassword_ReturnsTrue()
        {
            _user.PasswordHash = _svc.Hash(_user, "mypassword");
            Assert.True(_svc.Verify(_user, "mypassword"));
        }

        [Fact]
        public void Verify_WrongPassword_ReturnsFalse()
        {
            _user.PasswordHash = _svc.Hash(_user, "mypassword");
            Assert.False(_svc.Verify(_user, "wrongpassword"));
        }

        [Fact]
        public void Verify_EmptyPassword_ReturnsFalse()
        {
            _user.PasswordHash = _svc.Hash(_user, "mypassword");
            Assert.False(_svc.Verify(_user, ""));
        }
    }
}
