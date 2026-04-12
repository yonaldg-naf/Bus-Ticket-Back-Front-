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
    /// <summary>
    /// Manages the fleet of buses in the system.
    /// Provides admin CRUD operations for creating, updating, and removing buses.
    /// Bus codes must be unique across the system.
    /// Amenities are stored as a comma-separated string internally and returned as a list.
    /// </summary>
    public class BusService : IBusService
    {
        private readonly IRepository<Bus> _buses;

        public BusService(IRepository<Bus> buses) => _buses = buses;

        /// <summary>
        /// Creates a new bus in the fleet.
        /// Validates that the bus code is unique before saving.
        /// Amenities list is joined into a comma-separated string for storage.
        /// Throws InvalidOperationException if the bus code already exists.
        /// </summary>
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

        /// <summary>
        /// Returns all buses in the fleet.
        /// Amenities are split from comma-separated storage back into a list.
        /// </summary>
        public async Task<IEnumerable<BusResponseDto>> GetAllAsync(CancellationToken ct = default)
            => (await _buses.GetAllAsync(ct)).Select(Map);

        /// <summary>
        /// Updates a bus's registration number, type, seat count, status, and amenities.
        /// The bus code is not updatable — use a new bus for a different code.
        /// Returns null if no bus with the given ID exists.
        /// </summary>
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

        /// <summary>
        /// Updates only the operational status of a bus (Available, NotAvailable, UnderRepair).
        /// Used by the admin to quickly change a bus's availability without editing other fields.
        /// Returns null if no bus with the given ID exists.
        /// </summary>
        public async Task<BusResponseDto?> UpdateStatusAsync(Guid id, BusStatus status, CancellationToken ct = default)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            bus.Status       = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        /// <summary>
        /// Permanently deletes a bus from the fleet.
        /// Returns false if no bus with the given ID exists.
        /// Note: deleting a bus that has active schedules may cause referential issues —
        /// ensure schedules are removed or reassigned before deleting.
        /// </summary>
        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return false;
            await _buses.RemoveAsync(bus, ct);
            return true;
        }

        /// <summary>
        /// Maps a Bus entity to a BusResponseDto.
        /// Splits the comma-separated Amenities string back into a clean list.
        /// </summary>
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
