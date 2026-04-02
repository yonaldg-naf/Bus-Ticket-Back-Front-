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
        Task<BookingResponseDto> CreateByKeysAsync(Guid userId, CreateBookingByKeysRequestDto dto, CancellationToken ct = default);

        // Operator / Admin queries
        Task<object> GetOperatorStatsAsync(Guid operatorUserId, CancellationToken ct = default);
        Task<IEnumerable<BookingResponseDto>> GetByScheduleAsync(Guid scheduleId, Guid callerUserId, string callerRole, CancellationToken ct = default);

        // Bus-miss refund
        Task<BusMissResultDto> BusMissAsync(Guid userId, Guid bookingId, CancellationToken ct = default);
    }

    public class BusMissResultDto
    {
        public Guid BookingId { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal OriginalAmount { get; set; }
        public decimal RefundAmount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}