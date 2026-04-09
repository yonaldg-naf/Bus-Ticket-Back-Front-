using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Auth;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _users;
        private readonly IPasswordService _passwords;
        private readonly ITokenService _tokens;

        public AuthController(IUserService users, IPasswordService passwords, ITokenService tokens)
        {
            _users     = users;
            _passwords = passwords;
            _tokens    = tokens;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = new User
            {
                Username = dto.Username.Trim(),
                Email    = dto.Email.Trim(),
                FullName = dto.FullName.Trim(),
                Role     = Roles.Customer
            };

            try
            {
                var created = await _users.CreateAsync(user, dto.Password);
                var (token, expires) = _tokens.GenerateAccessToken(created);

                return Ok(new AuthResponseDto
                {
                    AccessToken  = token,
                    ExpiresAtUtc = expires,
                    UserId       = created.Id.ToString(),
                    Username     = created.Username,
                    Email        = created.Email,
                    Role         = created.Role,
                    FullName     = created.FullName,
                    CompanyName  = string.Empty
                });
            }
            catch (System.Exception ex) { return BadRequest(ex.Message); }
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _users.FindByUsernameAsync(dto.Username.Trim());
            if (user is null || !_passwords.Verify(user, dto.Password))
                return Unauthorized("Invalid username or password.");

            if (user.Role != Roles.Admin && user.Role != Roles.Customer)
                return Unauthorized("Invalid username or password.");

            var (token, expires) = _tokens.GenerateAccessToken(user);

            return Ok(new AuthResponseDto
            {
                AccessToken  = token,
                ExpiresAtUtc = expires,
                UserId       = user.Id.ToString(),
                Username     = user.Username,
                Email        = user.Email,
                Role         = user.Role,
                FullName     = user.FullName,
                CompanyName  = string.Empty
            });
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var ok = await _users.ResetPasswordAsync(dto.Email, dto.NewPassword, ct);
            return Ok(new { message = ok ? "Password reset successfully." : "If that email exists, the password has been updated." });
        }

        [Authorize(Roles = Roles.Admin)]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers(
            [FromQuery] string? role,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            var result = await _users.GetUsersPagedAsync(role, search, page, pageSize, ct);
            return Ok(result);
        }
    }
}
