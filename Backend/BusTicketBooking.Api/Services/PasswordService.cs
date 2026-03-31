using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Identity;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Handles password hashing and verification using ASP.NET Identity's
    /// PasswordHasher, which uses PBKDF2 with a random salt per hash.
    /// </summary>
    public class PasswordService : IPasswordService
    {
        private readonly PasswordHasher<User> _hasher = new();

        /// <summary>
        /// Hashes a plain-text password for the given user.
        /// Each call produces a different hash even for the same password
        /// because a unique salt is generated every time.
        /// </summary>
        /// <param name="user">The user the password belongs to (used as context by the hasher).</param>
        /// <param name="password">The plain-text password to hash.</param>
        /// <returns>A salted, hashed password string safe to store in the database.</returns>
        public string Hash(User user, string password)
            => _hasher.HashPassword(user, password);

        /// <summary>
        /// Checks whether a plain-text password matches the stored hash on the user.
        /// Also returns true when the hash needs to be upgraded (SuccessRehashNeeded),
        /// so the caller can silently re-hash and save the new value if desired.
        /// </summary>
        /// <param name="user">The user whose PasswordHash will be compared against.</param>
        /// <param name="password">The plain-text password entered by the user at login.</param>
        /// <returns>True if the password is correct; false otherwise.</returns>
        public bool Verify(User user, string password)
        {
            var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
            return result == PasswordVerificationResult.Success ||
                   result == PasswordVerificationResult.SuccessRehashNeeded;
        }
    }
}
