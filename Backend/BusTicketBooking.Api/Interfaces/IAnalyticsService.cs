using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Analytics;

namespace BusTicketBooking.Interfaces
{
    public interface IAnalyticsService
    {
        Task<OperatorAnalyticsResponseDto> GetOperatorAnalyticsAsync(Guid operatorUserId, int days, CancellationToken ct = default);
        Task<IEnumerable<OperatorPerformanceDto>> GetAllOperatorPerformanceAsync(CancellationToken ct = default);
        Task<object> GetAdminSummaryAsync(CancellationToken ct = default);
    }
}
