using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Handles user account operations: looking up users and creating new accounts.
    /// Used primarily by the AuthController during login and registration.
    /// </summary>
    public class UserService : IUserService
    {
        private readonly AppDbContext _db;
        private readonly IPasswordService _passwords;

        public UserService(AppDbContext db, IPasswordService passwords)
        {
            _db = db;
            _passwords = passwords;
        }

        /// <summary>
        /// Finds a user by their username (case-sensitive, exact match).
        /// Used during login to locate the account before verifying the password.
        /// Returns null if no user with that username exists.
        /// </summary>
        /// <param name="username">The username to search for.</param>
        /// <returns>The matching User, or null if not found.</returns>
        public async Task<User?> FindByUsernameAsync(string username)
            => await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);

        /// <summary>
        /// Finds a user by their email address (case-sensitive, exact match).
        /// Useful for checking if an email is already registered before creating a new account.
        /// Returns null if no user with that email exists.
        /// </summary>
        /// <param name="email">The email address to search for.</param>
        /// <returns>The matching User, or null if not found.</returns>
        public async Task<User?> FindByEmailAsync(string email)
            => await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

        /// <summary>
        /// Creates a new user account with a securely hashed password.
        ///
        /// Steps:
        ///   1. Checks that the username is not already taken — throws if it is.
        ///   2. Checks that the email is not already registered — throws if it is.
        ///   3. Hashes the plain-text password using PasswordService (PBKDF2 + salt).
        ///   4. Saves the new user to the database.
        ///
        /// Throws InvalidOperationException if the username or email is already in use.
        /// </summary>
        /// <param name="user">The User entity to create (Id, Username, Email, Role must be set).</param>
        /// <param name="plainPassword">The plain-text password entered by the user during registration.</param>
        /// <returns>The saved User entity with its generated Id and hashed password.</returns>
        public async Task<User> CreateAsync(User user, string plainPassword)
        {
            if (await _db.Users.AnyAsync(u => u.Username == user.Username))
                throw new InvalidOperationException("Username is already taken.");
            if (await _db.Users.AnyAsync(u => u.Email == user.Email))
                throw new InvalidOperationException("Email is already registered.");

            user.PasswordHash = _passwords.Hash(user, plainPassword);
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return user;
        }
    }
}
