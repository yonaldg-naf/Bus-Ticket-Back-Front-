using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Reviews;

namespace BusTicketBooking.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewResponseDto> CreateAsync(Guid userId, CreateReviewRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<ReviewResponseDto>> GetByScheduleAsync(Guid scheduleId, CancellationToken ct = default);
        Task<ScheduleRatingSummaryDto> GetSummaryAsync(Guid scheduleId, CancellationToken ct = default);
        Task<ReviewResponseDto?> GetMyReviewAsync(Guid userId, Guid bookingId, CancellationToken ct = default);
    }
}
