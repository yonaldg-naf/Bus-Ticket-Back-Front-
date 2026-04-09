using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.PromoCodes;

namespace BusTicketBooking.Interfaces
{
    public interface IPromoCodeService
    {
        Task<PromoCodeResponseDto> CreateAsync(CreatePromoCodeRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<PromoCodeResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<PromoCodeResponseDto?> ToggleAsync(Guid id, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
        Task<ValidatePromoCodeResponseDto> ValidateAsync(ValidatePromoCodeRequestDto dto, CancellationToken ct = default);
    }
}
