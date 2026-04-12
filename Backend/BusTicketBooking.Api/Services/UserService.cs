using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;
using BusTicketBooking.Contexts;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Handles user account operations: lookup, registration, and admin user management.
    /// Used by the auth flow (login/register) and the admin user list page.
    /// </summary>
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

        /// <summary>
        /// Finds a user by their username (case-sensitive).
        /// Returns null if no user with that username exists.
        /// Used during login to look up the user before verifying their password.
        /// </summary>
        public async Task<User?> FindByUsernameAsync(string username)
            => (await _users.FindAsync(u => u.Username == username)).FirstOrDefault();

        /// <summary>
        /// Finds a user by their email address.
        /// Returns null if no user with that email exists.
        /// Used during registration to check if the email is already taken.
        /// </summary>
        public async Task<User?> FindByEmailAsync(string email)
            => (await _users.FindAsync(u => u.Email == email)).FirstOrDefault();

        /// <summary>
        /// Registers a new user account.
        ///
        /// Validates that:
        ///   - The username is not already taken.
        ///   - The email is not already registered.
        ///
        /// Hashes the plain-text password before saving (never stores raw passwords).
        /// Throws InvalidOperationException if the username or email is already in use.
        /// Returns the saved user entity with the hashed password set.
        /// </summary>
        public async Task<User> CreateAsync(User user, string plainPassword)
        {
            if (await _users.ExistsAsync(u => u.Username == user.Username))
                throw new InvalidOperationException("Username is already taken.");
            if (await _users.ExistsAsync(u => u.Email == user.Email))
                throw new InvalidOperationException("Email is already registered.");

            user.PasswordHash = _passwords.Hash(user, plainPassword);
            return await _users.AddAsync(user);
        }

        /// <summary>
        /// Returns a paged, filterable list of all users in the system.
        /// Admin-only — used for the user management page.
        ///
        /// Supports filtering by:
        ///   - role   : exact match (e.g. "Admin", "Operator", "Customer").
        ///   - search : partial match on username, email, or full name (case-insensitive).
        ///
        /// Results are ordered newest first and paginated.
        /// Returns total count, current page, page size, and the list of users.
        /// </summary>
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

        /// <summary>
        /// Resets a user's password by email.
        /// Returns false if no user with that email exists.
        /// </summary>
        public async Task<bool> ResetPasswordAsync(string email, string newPassword, CancellationToken ct = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.Trim().ToLower(), ct);
            if (user is null) return false;

            user.PasswordHash = _passwords.Hash(user, newPassword);
            await _db.SaveChangesAsync(ct);
            return true;
        }
    }
}
