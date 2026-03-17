using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Stops;

namespace BusTicketBooking.Interfaces
{
    public interface IStopService
    {
        Task<IEnumerable<CityResponseDto>> GetCitiesAsync(CancellationToken ct = default);
        Task<IEnumerable<StopResponseDto>> GetStopsByCityAsync(string city, CancellationToken ct = default);
    }
}