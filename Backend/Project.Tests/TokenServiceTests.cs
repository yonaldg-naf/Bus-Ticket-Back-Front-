using BusTicketBooking.Models;
using BusTicketBooking.Services;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using Xunit;

public class TokenServiceTests
{
    private IConfiguration Config(Dictionary<string, string?> values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    private User SampleUser() =>
        new User
        {
            Id = Guid.NewGuid(),
            Username = "john",
            Email = "john@example.com",
            FullName = "John Doe",
            Role = "Admin"
        };

    // -----------------------------------------------------
    // 1. Valid token generation
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_ValidKey_ProducesToken()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('A', 40),
            ["Jwt:Issuer"] = "TestIssuer",
            ["Jwt:Audience"] = "TestAudience",
            ["Jwt:AccessTokenMinutes"] = "60"
        });

        var svc = new TokenService(cfg);
        var user = SampleUser();

        var (token, expires) = svc.GenerateAccessToken(user);

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.True(expires > DateTime.UtcNow);
    }

    // -----------------------------------------------------
    // 2. Missing key throws
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_MissingKey_Throws()
    {
        var cfg = Config(new()
        {
            ["Jwt:Issuer"] = "X",
            ["Jwt:Audience"] = "Y"
        });

        var svc = new TokenService(cfg);

        Assert.Throws<InvalidOperationException>(() =>
            svc.GenerateAccessToken(SampleUser()));
    }

    // -----------------------------------------------------
    // 3. Issuer is included when provided
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_IncludesIssuer_WhenProvided()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('B', 40),
            ["Jwt:Issuer"] = "IssuerTest",
        });

        var svc = new TokenService(cfg);

        var (jwt, _) = svc.GenerateAccessToken(SampleUser());

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        Assert.Equal("IssuerTest", token.Issuer);
    }

    // -----------------------------------------------------
    // 4. Audience included when provided
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_IncludesAudience()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('C', 40),
            ["Jwt:Audience"] = "MyAudience"
        });

        var svc = new TokenService(cfg);

        var (jwt, _) = svc.GenerateAccessToken(SampleUser());

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        Assert.Contains("MyAudience", token.Audiences);
    }

    // -----------------------------------------------------
    // 5. Expiration based on config
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_ExpirationMatchesMinutes()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('D', 40),
            ["Jwt:AccessTokenMinutes"] = "120"
        });

        var svc = new TokenService(cfg);

        var before = DateTime.UtcNow;
        var (_, exp) = svc.GenerateAccessToken(SampleUser());
        var after = DateTime.UtcNow;

        Assert.True(exp > before.AddMinutes(110));
        Assert.True(exp < after.AddMinutes(130));
    }

    // -----------------------------------------------------
    // 6. Claims included
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_IncludesUserClaims()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('E', 40)
        });

        var svc = new TokenService(cfg);
        var user = SampleUser();

        var (jwt, _) = svc.GenerateAccessToken(user);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        Assert.Contains(token.Claims, c =>
            c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());

        Assert.Contains(token.Claims, c =>
            c.Type == JwtRegisteredClaimNames.UniqueName && c.Value == user.Username);

        Assert.Contains(token.Claims, c =>
            c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);

        Assert.Contains(token.Claims, c =>
            c.Type == ClaimTypes.Role && c.Value == user.Role);
    }

    // -----------------------------------------------------
    // 7. Contains JTI
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_IncludesJti()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('F', 40),
        });

        var svc = new TokenService(cfg);

        var (jwt, _) = svc.GenerateAccessToken(SampleUser());

        var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

        Assert.True(token.Claims.Any(c => c.Type == JwtRegisteredClaimNames.Jti));
    }

    // -----------------------------------------------------
    // 8. Different users produce different tokens
    // -----------------------------------------------------

    [Fact]
    public void GenerateAccessToken_DifferentUsers_ProduceDifferentTokens()
    {
        var cfg = Config(new()
        {
            ["Jwt:Key"] = new string('G', 40),
        });

        var svc = new TokenService(cfg);

        var (t1, _) = svc.GenerateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            Username = "u1",
            Email = "u1@test.com",
            FullName = "U1",
            Role = "Customer"
        });

        var (t2, _) = svc.GenerateAccessToken(new User
        {
            Id = Guid.NewGuid(),
            Username = "u2",
            Email = "u2@test.com",
            FullName = "U2",
            Role = "Customer"
        });

        Assert.NotEqual(t1, t2);
    }
}