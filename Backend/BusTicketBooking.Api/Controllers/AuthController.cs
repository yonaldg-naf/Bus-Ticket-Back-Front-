using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Auth;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _users;
        private readonly IPasswordService _passwords;
        private readonly ITokenService _tokens;
        private readonly AppDbContext _db;

        public AuthController(IUserService users, IPasswordService passwords, ITokenService tokens, AppDbContext db)
        {
            _users = users;
            _passwords = passwords;
            _tokens = tokens;
            _db = db;
        }

        // ---------------------- REGISTER ----------------------
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = new User
            {
                Username = dto.Username.Trim(),
                Email = dto.Email.Trim(),
                FullName = dto.FullName.Trim(),
                Role = dto.Role.Trim()
            };

            try
            {
                var created = await _users.CreateAsync(user, dto.Password);
                var (token, expires) = _tokens.GenerateAccessToken(created);

                return Ok(new AuthResponseDto
                {
                    AccessToken = token,
                    ExpiresAtUtc = expires,
                    UserId = created.Id.ToString(),
                    Username = created.Username,
                    Email = created.Email,
                    Role = created.Role,
                    FullName = created.FullName,
                    CompanyName = null
                });
            }
            catch (System.Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // ---------------------- LOGIN ----------------------
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _users.FindByUsernameAsync(dto.Username.Trim());
            if (user is null) return Unauthorized("Invalid username or password.");
            if (!_passwords.Verify(user, dto.Password)) return Unauthorized("Invalid username or password.");

            var (token, expires) = _tokens.GenerateAccessToken(user);

            // LOAD OPERATOR PROFILE IF OPERATOR
            string? companyName = null;

            if (user.Role == Roles.Operator)
            {
                var op = await _db.BusOperators
                    .AsNoTracking()
                    .FirstOrDefaultAsync(o => o.UserId == user.Id, ct);

                companyName = op?.CompanyName;
            }

            return Ok(new AuthResponseDto
            {
                AccessToken = token,
                ExpiresAtUtc = expires,
                UserId = user.Id.ToString(),
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                FullName = user.FullName,
                CompanyName = companyName
            });
        }
    }
}