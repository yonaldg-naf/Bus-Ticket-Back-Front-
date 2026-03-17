using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Routes;

namespace BusTicketBooking.Interfaces
{
    public interface IRouteService
    {
        // Existing (Id-based)
        Task<RouteResponseDto> CreateAsync(CreateRouteRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<RouteResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<RouteResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task<RouteResponseDto?> UpdateAsync(Guid id, UpdateRouteRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);

        // NEW (by-keys)
        Task<RouteResponseDto> CreateByKeysAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<RouteResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default);
        Task<RouteResponseDto?> UpdateByKeysAsync(string operatorUsernameOrCompany, string routeCode, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteByKeysAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default);
    }
}