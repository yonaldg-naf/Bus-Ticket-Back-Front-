using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace BusTicketBooking.Interfaces
{
    public interface IAnnouncementService
    {
        Task<object> CreateAsync(Guid operatorUserId, CreateAnnouncementDto dto, CancellationToken ct = default);
        Task<IEnumerable<object>> GetByScheduleAsync(Guid scheduleId, CancellationToken ct = default);
        Task<IEnumerable<object>> GetMyAsync(Guid operatorUserId, CancellationToken ct = default);
        Task<bool> DeleteAsync(Guid operatorUserId, Guid id, CancellationToken ct = default);
    }

    public class CreateAnnouncementDto
    {
        public Guid ScheduleId { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Type { get; set; }
    }
}
