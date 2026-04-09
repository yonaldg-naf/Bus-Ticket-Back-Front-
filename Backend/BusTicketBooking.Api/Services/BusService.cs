using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Services
{
    public class BusService : IBusService
    {
        private readonly IRepository<Bus> _buses;

        public BusService(IRepository<Bus> buses) => _buses = buses;

        public async Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default)
        {
            var dup = (await _buses.FindAsync(b => b.Code == dto.Code, ct)).Any();
            if (dup) throw new InvalidOperationException("Bus code already exists.");

            var e = new Bus
            {
                Code               = dto.Code.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                BusType            = dto.BusType,
                TotalSeats         = dto.TotalSeats,
                Status             = dto.Status,
                Amenities          = dto.Amenities.Count > 0
                    ? string.Join(",", dto.Amenities.Select(a => a.Trim()))
                    : null
            };
            e = await _buses.AddAsync(e, ct);
            return Map(e);
        }

        public async Task<IEnumerable<BusResponseDto>> GetAllAsync(CancellationToken ct = default)
            => (await _buses.GetAllAsync(ct)).Select(Map);

        public async Task<BusResponseDto?> UpdateAsync(Guid id, UpdateBusRequestDto dto, CancellationToken ct = default)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            bus.RegistrationNumber = dto.RegistrationNumber.Trim();
            bus.BusType            = dto.BusType;
            bus.TotalSeats         = dto.TotalSeats;
            bus.Status             = dto.Status;
            bus.Amenities          = dto.Amenities.Count > 0
                ? string.Join(",", dto.Amenities.Select(a => a.Trim()))
                : null;
            bus.UpdatedAtUtc = DateTime.UtcNow;

            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        public async Task<BusResponseDto?> UpdateStatusAsync(Guid id, BusStatus status, CancellationToken ct = default)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            bus.Status       = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return false;
            await _buses.RemoveAsync(bus, ct);
            return true;
        }

        private static BusResponseDto Map(Bus e) => new()
        {
            Id                 = e.Id,
            Code               = e.Code,
            RegistrationNumber = e.RegistrationNumber,
            BusType            = e.BusType,
            TotalSeats         = e.TotalSeats,
            Status             = e.Status,
            Amenities          = string.IsNullOrWhiteSpace(e.Amenities)
                ? new List<string>()
                : e.Amenities.Split(',', StringSplitOptions.RemoveEmptyEntries)
                             .Select(a => a.Trim()).Where(a => a.Length > 0).ToList(),
            CreatedAtUtc = e.CreatedAtUtc,
            UpdatedAtUtc = e.UpdatedAtUtc
        };
    }
}
