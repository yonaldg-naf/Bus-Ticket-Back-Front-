using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services
{
    public class PasswordServiceTests
    {
        private readonly PasswordService _svc = new();

        [Fact]
        public void Hash_ReturnsNonEmptyString()
        {
            var user = SeedHelper.MakeUser();
            var hash = _svc.Hash(user, "mypassword");
            Assert.False(string.IsNullOrWhiteSpace(hash));
        }

        [Fact]
        public void Hash_ProducesDifferentResults_ForSamePassword()
        {
            // ASP.NET Identity hasher salts each hash, so two hashes of the same
            // password should never be identical.
            var user  = SeedHelper.MakeUser();
            var hash1 = _svc.Hash(user, "samepassword");
            var hash2 = _svc.Hash(user, "samepassword");
            Assert.NotEqual(hash1, hash2);
        }

        [Fact]
        public void Verify_ReturnsTrue_ForCorrectPassword()
        {
            var user = SeedHelper.MakeUser();
            user.PasswordHash = _svc.Hash(user, "correct");
            Assert.True(_svc.Verify(user, "correct"));
        }

        [Fact]
        public void Verify_ReturnsFalse_ForWrongPassword()
        {
            var user = SeedHelper.MakeUser();
            user.PasswordHash = _svc.Hash(user, "correct");
            Assert.False(_svc.Verify(user, "wrong"));
        }

        [Fact]
        public void Verify_ReturnsFalse_ForEmptyPassword()
        {
            var user = SeedHelper.MakeUser();
            user.PasswordHash = _svc.Hash(user, "correct");
            Assert.False(_svc.Verify(user, ""));
        }
    }
}
