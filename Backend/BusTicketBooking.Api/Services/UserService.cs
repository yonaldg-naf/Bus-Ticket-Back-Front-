using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;
using BusTicketBooking.Contexts;

namespace BusTicketBooking.Services
{
    public class UserService : IUserService
    {
        private readonly IRepository<User> _users;
        private readonly IPasswordService _passwords;
        private readonly AppDbContext _db;

        public UserService(IRepository<User> users, IPasswordService passwords, AppDbContext db)
        {
            _users     = users;
            _passwords = passwords;
            _db        = db;
        }

        public async Task<User?> FindByUsernameAsync(string username)
            => (await _users.FindAsync(u => u.Username == username)).FirstOrDefault();

        public async Task<User?> FindByEmailAsync(string email)
            => (await _users.FindAsync(u => u.Email == email)).FirstOrDefault();

        public async Task<User> CreateAsync(User user, string plainPassword)
        {
            if (await _users.ExistsAsync(u => u.Username == user.Username))
                throw new InvalidOperationException("Username is already taken.");
            if (await _users.ExistsAsync(u => u.Email == user.Email))
                throw new InvalidOperationException("Email is already registered.");

            user.PasswordHash = _passwords.Hash(user, plainPassword);
            return await _users.AddAsync(user);
        }

        /// <summary>Returns the company name for an operator user, or null if not found.</summary>
        public async Task<string?> GetOperatorCompanyNameAsync(Guid userId, CancellationToken ct = default)
        {
            var op = await _db.BusOperators
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.UserId == userId, ct);
            return op?.CompanyName;
        }

        /// <summary>Returns a paged, filterable list of all users (admin use).</summary>
        public async Task<object> GetUsersPagedAsync(string? role, string? search, int page, int pageSize, CancellationToken ct = default)
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
                .Select(u => new { u.Id, u.Username, u.Email, u.FullName, u.Role, u.CreatedAtUtc })
                .ToListAsync(ct);

            return new { total, page, pageSize, items = users };
        }
    }
}
