using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Complaints;

namespace BusTicketBooking.Interfaces
{
    public interface IComplaintService
    {
        Task<ComplaintResponseDto> RaiseAsync(Guid userId, Guid bookingId, CreateComplaintRequestDto dto, CancellationToken ct = default);
        Task<IEnumerable<ComplaintResponseDto>> GetMyAsync(Guid userId, CancellationToken ct = default);
        Task<IEnumerable<ComplaintResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<ComplaintResponseDto?> ReplyAsync(Guid id, ReplyComplaintRequestDto dto, CancellationToken ct = default);
    }
}
