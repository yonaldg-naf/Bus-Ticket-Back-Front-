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

        // by-keys (used by frontend)
        Task<RouteResponseDto> CreateByKeysAsync(CreateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<RouteResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default);
        Task<RouteResponseDto?> UpdateByKeysAsync(string operatorUsernameOrCompany, string routeCode, UpdateRouteByKeysRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteByKeysAsync(string operatorUsernameOrCompany, string routeCode, CancellationToken ct = default);
    }
}
