using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _db;
        private readonly IPasswordService _passwords;

        public UserService(AppDbContext db, IPasswordService passwords)
        {
            _db = db;
            _passwords = passwords;
        }

        public async Task<User?> FindByUsernameAsync(string username)
            => await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == username);

        public async Task<User?> FindByEmailAsync(string email)
            => await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);

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