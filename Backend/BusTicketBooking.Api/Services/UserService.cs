using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Handles user account operations: looking up users and creating new accounts.
    /// Used primarily by the AuthController during login and registration.
    /// </summary>
    public class UserService : IUserService
    {
        private readonly IRepository<User> _users;
        private readonly IPasswordService _passwords;

        public UserService(IRepository<User> users, IPasswordService passwords)
        {
            _users     = users;
            _passwords = passwords;
        }

        /// <summary>
        /// Finds a user by their username (case-sensitive, exact match).
        /// Returns null if no user with that username exists.
        /// </summary>
        public async Task<User?> FindByUsernameAsync(string username)
            => (await _users.FindAsync(u => u.Username == username)).FirstOrDefault();

        /// <summary>
        /// Finds a user by their email address (case-sensitive, exact match).
        /// Returns null if no user with that email exists.
        /// </summary>
        public async Task<User?> FindByEmailAsync(string email)
            => (await _users.FindAsync(u => u.Email == email)).FirstOrDefault();

        /// <summary>
        /// Creates a new user account with a securely hashed password.
        /// Throws InvalidOperationException if the username or email is already in use.
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
    }
}
