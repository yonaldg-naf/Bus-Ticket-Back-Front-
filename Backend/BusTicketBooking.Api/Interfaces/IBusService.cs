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
        // Secured (role-aware) — used by BusesController
        Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<BusResponseDto>> GetAllSecuredAsync(Guid userId, string role, CancellationToken ct = default);
        Task<BusResponseDto?> GetByIdSecuredAsync(Guid id, Guid userId, string role, CancellationToken ct = default);
        Task<BusResponseDto?> UpdateSecuredAsync(Guid id, UpdateBusRequestDto dto, Guid userId, string role, CancellationToken ct = default);
        Task<bool> DeleteSecuredAsync(Guid id, Guid userId, string role, CancellationToken ct = default);
        Task<BusResponseDto?> UpdateStatusSecuredAsync(Guid id, BusStatus status, Guid userId, string role, CancellationToken ct = default);

        // by-keys (used by frontend)
        Task<BusResponseDto> CreateByOperatorAsync(CreateBusByOperatorDto dto, CancellationToken ct = default);
        Task<BusResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string busCode, CancellationToken ct = default);
        Task<BusResponseDto?> UpdateStatusByCodeAsync(string operatorUsernameOrCompany, string busCode, BusStatus status, CancellationToken ct = default);
    }
}
