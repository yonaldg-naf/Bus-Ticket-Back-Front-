using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Stops;

namespace BusTicketBooking.Interfaces
{
    public interface IStopService
    {
        // Public reads
        Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default);
        Task<IEnumerable<StopResponseDto>> GetStopsByCityAsync(string city, CancellationToken ct = default);

        // Admin CRUD
        Task<StopResponseDto> CreateAsync(CreateStopRequestDto dto, CancellationToken ct = default);
        Task<StopResponseDto?> UpdateAsync(Guid id, UpdateStopRequestDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);

        // Admin city management
        Task<int> RenameCityAsync(string currentCity, string newCity, CancellationToken ct = default);
    }
}
