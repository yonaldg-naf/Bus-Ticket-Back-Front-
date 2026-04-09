using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Bookings;

namespace BusTicketBooking.Interfaces
{
    public interface IBookingService
    {
        Task<BookingResponseDto> CreateAsync(Guid userId, CreateBookingRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<BookingResponseDto>> GetMyAsync(Guid userId, CancellationToken ct = default);
        Task<BookingResponseDto?> GetByIdForUserAsync(Guid userId, Guid bookingId, bool allowPrivileged = false, CancellationToken ct = default);
        Task<bool> CancelAsync(Guid userId, Guid bookingId, bool allowPrivileged = false, CancellationToken ct = default);
        Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool allowPrivileged = false, CancellationToken ct = default);
        Task<BookingResponseDto?> PayAsync(Guid userId, Guid bookingId, decimal amount, string providerRef, bool useWallet, bool allowPrivileged = false, CancellationToken ct = default);
    }
}
