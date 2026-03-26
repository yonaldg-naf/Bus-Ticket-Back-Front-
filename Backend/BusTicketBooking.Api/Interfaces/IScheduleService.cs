using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Dtos.Common;
using BusTicketBooking.Dtos.Schedules;

namespace BusTicketBooking.Interfaces
{
    public interface IScheduleService
    {
        // Existing (Id-based)
        Task<ScheduleResponseDto> CreateAsync(CreateScheduleRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<ScheduleResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<IEnumerable<ScheduleResponseDto>> GetAllSecuredAsync(Guid userId, string role, CancellationToken ct = default);
        Task<ScheduleResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<ScheduleResponseDto?> UpdateAsync(Guid id, UpdateScheduleRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
        Task<PagedResult<ScheduleResponseDto>> SearchAsync(Guid fromStopId, Guid toStopId, DateOnly date, PagedRequestDto request, CancellationToken ct = default, int utcOffsetMinutes = 0);
        Task<SeatAvailabilityResponseDto> GetAvailabilityAsync(Guid scheduleId, CancellationToken ct = default);

        // NEW (by-keys)
        Task<ScheduleResponseDto> CreateByKeysAsync(CreateScheduleByKeysRequestDto dto, CancellationToken ct = default);
        Task<PagedResult<ScheduleResponseDto>> SearchByKeysAsync(SearchSchedulesByKeysRequestDto dto, CancellationToken ct = default);
        Task<SeatAvailabilityResponseDto> GetAvailabilityByKeysAsync(string busCode, DateTime departureUtc, CancellationToken ct = default);
        Task<bool> DeleteByKeysAsync(string busCode, DateTime departureUtc, CancellationToken ct = default);
        Task<ScheduleResponseDto?> CancelAsync(Guid id, string reason, CancellationToken ct = default);
    }
}