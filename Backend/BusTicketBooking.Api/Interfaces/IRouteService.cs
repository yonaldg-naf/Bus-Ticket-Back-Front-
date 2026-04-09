using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Routes;

namespace BusTicketBooking.Interfaces
{
    public interface IRouteService
    {
        Task<IEnumerable<RouteResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<RouteResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<RouteResponseDto> CreateAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<RouteResponseDto?> UpdateAsync(Guid id, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    }
}
