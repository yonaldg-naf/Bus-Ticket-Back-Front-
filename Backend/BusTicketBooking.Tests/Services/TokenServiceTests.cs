using System.IdentityModel.Tokens.Jwt;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;
using Microsoft.Extensions.Configuration;

namespace BusTicketBooking.Tests.Services;

public class TokenServiceTests
{
    // Build a TokenService with a real in-memory IConfiguration
    private static TokenService Build(int expiryMinutes = 60)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]                = "super-secret-test-key-that-is-long-enough-32chars",
                ["Jwt:Issuer"]             = "TestIssuer",
                ["Jwt:Audience"]           = "TestAudience",
                ["Jwt:AccessTokenMinutes"] = expiryMinutes.ToString()
            })
            .Build();

        return new TokenService(config);
    }

    // ── GenerateAccessToken ───────────────────────────────────────────────────

    [Fact]
    public void GenerateToken_ReturnsNonEmptyJwt()
    {
        var svc  = Build();
        var user = SeedHelper.MakeUser(Roles.Customer);

        var (token, _) = svc.GenerateAccessToken(user);

        Assert.False(string.IsNullOrWhiteSpace(token));
        // A JWT has exactly 3 dot-separated parts
        Assert.Equal(3, token.Split('.').Length);
    }

    [Fact]
    public void GenerateToken_ExpiresAtUtc_IsInFuture()
    {
        var svc  = Build(expiryMinutes: 60);
        var user = SeedHelper.MakeUser(Roles.Customer);

        var (_, expires) = svc.GenerateAccessToken(user);

        Assert.True(expires > DateTime.UtcNow);
        // Should expire roughly 60 minutes from now (allow 5s tolerance)
        Assert.True(expires <= DateTime.UtcNow.AddMinutes(61));
    }

    [Fact]
    public void GenerateToken_ContainsCorrectClaims()
    {
        var svc  = Build();
        var user = SeedHelper.MakeUser(Roles.Operator);
        user.FullName = "Test Operator";

        var (token, _) = svc.GenerateAccessToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(token);

        // sub claim = user ID
        Assert.Equal(user.Id.ToString(),
            jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);

        // role claim = user role
        Assert.Equal(Roles.Operator,
            jwt.Claims.First(c => c.Type == "role" ||
                                  c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role").Value);

        // email claim
        Assert.Equal(user.Email,
            jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
    }

    [Fact]
    public void GenerateToken_ContainsIssuerAndAudience()
    {
        var svc  = Build();
        var user = SeedHelper.MakeUser(Roles.Admin);

        var (token, _) = svc.GenerateAccessToken(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt     = handler.ReadJwtToken(token);

        Assert.Equal("TestIssuer",   jwt.Issuer);
        Assert.Contains("TestAudience", jwt.Audiences);
    }

    [Fact]
    public void GenerateToken_TwoCallsProduceDifferentTokens()
    {
        // Each token has a unique jti (JWT ID) claim so they're never identical
        var svc  = Build();
        var user = SeedHelper.MakeUser(Roles.Customer);

        var (token1, _) = svc.GenerateAccessToken(user);
        var (token2, _) = svc.GenerateAccessToken(user);

        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void GenerateToken_Throws_WhenJwtKeyMissing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var svc  = new TokenService(config);
        var user = SeedHelper.MakeUser(Roles.Customer);

        Assert.Throws<InvalidOperationException>(() => svc.GenerateAccessToken(user));
    }

    [Fact]
    public void GenerateToken_CustomExpiry_IsRespected()
    {
        var svc  = Build(expiryMinutes: 120);
        var user = SeedHelper.MakeUser(Roles.Customer);

        var (_, expires) = svc.GenerateAccessToken(user);

        // Should expire roughly 120 minutes from now
        var diff = (expires - DateTime.UtcNow).TotalMinutes;
        Assert.True(diff > 119 && diff <= 121);
    }
}
