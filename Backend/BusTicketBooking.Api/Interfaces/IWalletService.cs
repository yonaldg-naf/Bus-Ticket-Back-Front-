using System;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Models;

namespace BusTicketBooking.Interfaces
{
    public interface IWalletService
    {
        Task<Wallet> GetOrCreateAsync(Guid userId, CancellationToken ct = default);
        Task CreditAsync(Guid userId, decimal amount, string reason, Guid? bookingId = null, string? description = null, CancellationToken ct = default);
        Task<bool> DebitAsync(Guid userId, decimal amount, string reason, Guid? bookingId = null, string? description = null, CancellationToken ct = default);
    }
}
