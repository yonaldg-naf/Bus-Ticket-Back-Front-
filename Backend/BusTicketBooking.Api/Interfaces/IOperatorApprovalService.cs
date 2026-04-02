using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace BusTicketBooking.Interfaces
{
    public interface IOperatorApprovalService
    {
        Task<IEnumerable<object>> GetPendingAsync(CancellationToken ct = default);
        Task<object> ApproveAsync(Guid userId, ApproveOperatorDto dto, CancellationToken ct = default);
        Task<object> RejectAsync(Guid userId, CancellationToken ct = default);
    }

    public class ApproveOperatorDto
    {
        public string? CompanyName { get; set; }
        public string? SupportPhone { get; set; }
    }
}
