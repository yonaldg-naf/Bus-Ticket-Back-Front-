using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Services
{
    public class OperatorApprovalService : IOperatorApprovalService
    {
        private readonly AppDbContext _db;

        public OperatorApprovalService(AppDbContext db) => _db = db;

        public async Task<IEnumerable<object>> GetPendingAsync(CancellationToken ct = default)
        {
            return await _db.Users
                .AsNoTracking()
                .Where(u => u.Role == Roles.PendingOperator)
                .OrderByDescending(u => u.CreatedAtUtc)
                .Select(u => (object)new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.FullName,
                    u.Role,
                    u.CreatedAtUtc,
                })
                .ToListAsync(ct);
        }

        public async Task<object> ApproveAsync(Guid userId, ApproveOperatorDto dto, CancellationToken ct = default)
        {
            var user = await _db.Users.FindAsync(new object[] { userId }, ct)
                ?? throw new NotFoundException("User not found.");

            if (user.Role != Roles.PendingOperator)
                throw new ValidationException("User is not a pending operator.");

            user.Role          = Roles.Operator;
            user.UpdatedAtUtc  = DateTime.UtcNow;

            var profile = new BusOperator
            {
                UserId      = user.Id,
                CompanyName = dto.CompanyName?.Trim() ?? user.FullName,
                SupportPhone = dto.SupportPhone?.Trim() ?? string.Empty,
            };

            _db.BusOperators.Add(profile);
            await _db.SaveChangesAsync(ct);

            return new { message = $"{user.FullName} approved as operator.", userId = user.Id };
        }

        public async Task<object> RejectAsync(Guid userId, CancellationToken ct = default)
        {
            var user = await _db.Users.FindAsync(new object[] { userId }, ct)
                ?? throw new NotFoundException("User not found.");

            if (user.Role != Roles.PendingOperator)
                throw new ValidationException("User is not a pending operator.");

            user.Role         = Roles.Customer;
            user.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            return new { message = $"{user.FullName}'s operator request was rejected." };
        }
    }
}
