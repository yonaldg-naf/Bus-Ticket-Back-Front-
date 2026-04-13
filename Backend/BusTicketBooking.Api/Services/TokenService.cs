using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Generates signed JWT access tokens used to authenticate API requests.
    /// Token settings (secret key, issuer, audience, expiry) are read from
    /// the application configuration under the "Jwt" section.
    /// </summary>
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config) => _config = config;

        /// <summary>
        /// Creates a signed JWT access token for the given user.
        ///
        /// The token contains the following claims:
        ///   - sub          : user's unique ID (GUID)
        ///   - unique_name  : username
        ///   - email        : user's email address
        ///   - name         : user's full name (falls back to username if not set)
        ///   - role         : user's role (Admin / Customer)
        ///   - jti          : unique token ID to prevent replay attacks
        ///
        /// Signed with HMAC-SHA256 using the secret key from config.
        /// Throws InvalidOperationException if Jwt:Key is missing from config.
        /// </summary>
        /// <param name="user">The authenticated user to generate a token for.</param>
        /// <returns>
        /// A tuple containing:
        ///   - token        : the signed JWT string to send to the client
        ///   - expiresAtUtc : the exact UTC time the token expires
        /// </returns>
        public (string token, DateTime expiresAtUtc) GenerateAccessToken(User user)
        {
            string key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing");
            string? issuer = _config["Jwt:Issuer"];
            string? audience = _config["Jwt:Audience"];
            int minutes = int.TryParse(_config["Jwt:AccessTokenMinutes"], out var m) ? m : 60;

            var expires = DateTime.UtcNow.AddMinutes(minutes);
            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.UniqueName, user.Username),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new(ClaimTypes.Name, user.FullName ?? user.Username),
                new(ClaimTypes.Role, user.Role),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: string.IsNullOrWhiteSpace(issuer) ? null : issuer,
                audience: string.IsNullOrWhiteSpace(audience) ? null : audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: expires,
                signingCredentials: creds);

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return (jwt, expires);
        }
    }
}
