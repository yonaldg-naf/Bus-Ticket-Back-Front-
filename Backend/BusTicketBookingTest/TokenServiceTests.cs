using Xunit;
using Moq;
using Microsoft.Extensions.Configuration;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using System.IdentityModel.Tokens.Jwt;

namespace BusTicketBooking.Tests.Services
{
    public class TokenServiceTests
    {
        private readonly Mock<IConfiguration> _configMock;
        private readonly TokenService _service;

        public TokenServiceTests()
        {
            _configMock = new Mock<IConfiguration>();
            _configMock.Setup(c => c["Jwt:Key"]).Returns("THIS_IS_A_TEST_SECRET_KEY_1234567890");
            _configMock.Setup(c => c["Jwt:Issuer"]).Returns("TestIssuer");
            _configMock.Setup(c => c["Jwt:Audience"]).Returns("TestAudience");
            _configMock.Setup(c => c["Jwt:AccessTokenMinutes"]).Returns("30");

            _service = new TokenService(_configMock.Object);
        }

        [Fact]
        public void GenerateAccessToken_ShouldReturnValidToken()
        {
            // Arrange
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = "testuser",
                Email = "test@test.com",
                FullName = "Test User",
                Role = "Admin"
            };

            // Act
            var (token, expires) = _service.GenerateAccessToken(user);

            // Assert
            Assert.False(string.IsNullOrWhiteSpace(token));
            Assert.True(expires > DateTime.UtcNow);

            // Validate token format
            var handler = new JwtSecurityTokenHandler();
            Assert.True(handler.CanReadToken(token));

            var jwt = handler.ReadJwtToken(token);

            Assert.Equal("testuser", jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.UniqueName).Value);
            Assert.Equal("test@test.com", jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
            Assert.Equal("Admin", jwt.Claims.First(c => c.Type == System.Security.Claims.ClaimTypes.Role).Value);
        }
    }
}