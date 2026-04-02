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
    /// <summary>
    /// Handles the operator registration approval workflow.
    /// When a user registers as an operator, their role is set to PendingOperator.
    /// An admin must then approve or reject the request before they can use operator features.
    /// </summary>
    public class OperatorApprovalService : IOperatorApprovalService
    {
        private readonly AppDbContext _db;

        public OperatorApprovalService(AppDbContext db) => _db = db;

        /// <summary>
        /// Returns a list of all users who have registered as operators but are still waiting for approval.
        /// These are users with the role "PendingOperator", ordered by registration date (newest first).
        /// Used by the admin to see who is waiting to be approved.
        /// </summary>
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

        /// <summary>
        /// Approves a pending operator registration.
        ///
        /// What it does:
        ///   1. Finds the user by ID and checks they are still in PendingOperator status.
        ///   2. Changes their role from PendingOperator → Operator.
        ///   3. Creates a BusOperator profile for them with the provided company name and support phone.
        ///      If no company name is given, the user's full name is used as the company name.
        ///   4. Saves everything and returns a success message.
        ///
        /// Throws NotFoundException if the user doesn't exist.
        /// Throws ValidationException if the user is not in PendingOperator status.
        /// </summary>
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

        /// <summary>
        /// Rejects a pending operator registration.
        ///
        /// What it does:
        ///   1. Finds the user by ID and checks they are still in PendingOperator status.
        ///   2. Changes their role from PendingOperator → Customer (they can still use the app as a customer).
        ///   3. No operator profile is created.
        ///
        /// Throws NotFoundException if the user doesn't exist.
        /// Throws ValidationException if the user is not in PendingOperator status.
        /// Returns a message confirming the rejection.
        /// </summary>
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
