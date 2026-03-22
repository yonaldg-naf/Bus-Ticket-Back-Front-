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

            // If registering as Operator, set to PendingOperator until admin approves
            var requestedRole = dto.Role.Trim();
            var assignedRole = requestedRole == Roles.Operator
                                    ? Roles.PendingOperator
                                    : requestedRole;

            var user = new User
            {
                Username = dto.Username.Trim(),
                Email = dto.Email.Trim(),
                FullName = dto.FullName.Trim(),
                Role = assignedRole
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
    

        // ---------------------- ADMIN: LIST ALL USERS ----------------------
        [Authorize(Roles = Roles.Admin)]
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers(
            [FromQuery] string? role,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken ct = default)
        {
            var query = _db.Users.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role.Trim());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(u => u.Username.ToLower().Contains(s)
                                      || u.Email.ToLower().Contains(s)
                                      || u.FullName.ToLower().Contains(s));
            }

            var total = await query.LongCountAsync(ct);

            var users = await query
                .OrderByDescending(u => u.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Role,
                    u.CreatedAtUtc
                })
                .ToListAsync(ct);

            return Ok(new { total, page, pageSize, items = users });
        }
    }
}