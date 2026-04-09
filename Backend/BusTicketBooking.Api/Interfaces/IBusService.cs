using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Interfaces
{
    public interface IBusService
    {
        Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<BusResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<BusResponseDto?> UpdateAsync(Guid id, UpdateBusRequestDto dto, CancellationToken ct = default);
        Task<BusResponseDto?> UpdateStatusAsync(Guid id, BusStatus status, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    }
}
