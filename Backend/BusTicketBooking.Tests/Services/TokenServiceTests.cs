using System.IdentityModel.Tokens.Jwt;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using Microsoft.Extensions.Configuration;

namespace BusTicketBooking.Tests.Services
{
    public class TokenServiceTests
    {
        private static TokenService CreateService(int expiryMinutes = 60, string? issuer = null, string? audience = null)
        {
            var config = new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "super-secret-key-that-is-long-enough-for-hmac256",
                ["Jwt:AccessTokenMinutes"] = expiryMinutes.ToString(),
                ["Jwt:Issuer"] = issuer,
                ["Jwt:Audience"] = audience
            };
            var cfg = new ConfigurationBuilder().AddInMemoryCollection(config).Build();
            return new TokenService(cfg);
        }

        private static User MakeUser() => new()
        {
            Id = Guid.NewGuid(),
            Username = "john",
            Email = "john@example.com",
            FullName = "John Doe",
            Role = "Customer"
        };

        [Fact]
        public void GenerateAccessToken_ReturnsNonEmptyToken()
        {
            var svc = CreateService();
            var (token, _) = svc.GenerateAccessToken(MakeUser());
            Assert.False(string.IsNullOrWhiteSpace(token));
        }

        [Fact]
        public void GenerateAccessToken_ExpiresInFuture()
        {
            var svc = CreateService(expiryMinutes: 60);
            var (_, expiresAt) = svc.GenerateAccessToken(MakeUser());
            Assert.True(expiresAt > DateTime.UtcNow);
        }

        [Fact]
        public void GenerateAccessToken_ContainsRoleClaim()
        {
            var svc = CreateService();
            var user = MakeUser();
            user.Role = "Admin";
            var (token, _) = svc.GenerateAccessToken(user);

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            // ClaimTypes.Role maps to the long URI; check both forms
            var roleClaim = jwt.Claims.FirstOrDefault(c =>
                c.Type == "role" ||
                c.Type == System.Security.Claims.ClaimTypes.Role);
            Assert.Equal("Admin", roleClaim?.Value);
        }

        [Fact]
        public void GenerateAccessToken_ContainsSubClaim()
        {
            var svc = CreateService();
            var user = MakeUser();
            var (token, _) = svc.GenerateAccessToken(user);

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            var sub = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub);
            Assert.Equal(user.Id.ToString(), sub?.Value);
        }

        [Fact]
        public void GenerateAccessToken_MissingKey_ThrowsInvalidOperationException()
        {
            var cfg = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>())
                .Build();
            var svc = new TokenService(cfg);
            Assert.Throws<InvalidOperationException>(() => svc.GenerateAccessToken(MakeUser()));
        }

        [Fact]
        public void GenerateAccessToken_WithIssuerAndAudience_SetsThemOnToken()
        {
            var svc = CreateService(issuer: "myissuer", audience: "myaudience");
            var (token, _) = svc.GenerateAccessToken(MakeUser());

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);
            Assert.Equal("myissuer", jwt.Issuer);
            Assert.Contains("myaudience", jwt.Audiences);
        }

        [Fact]
        public void GenerateAccessToken_CustomExpiry_ReflectsInExpiresAt()
        {
            var svc = CreateService(expiryMinutes: 30);
            var before = DateTime.UtcNow;
            var (_, expiresAt) = svc.GenerateAccessToken(MakeUser());
            var after = DateTime.UtcNow;

            Assert.True(expiresAt >= before.AddMinutes(29));
            Assert.True(expiresAt <= after.AddMinutes(31));
        }
    }
}
