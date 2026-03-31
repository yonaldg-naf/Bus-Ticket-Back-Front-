using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Services
{
    /// <summary>
    /// Manages bus fleet operations for operators and admins.
    /// Provides both role-aware (secured) methods that enforce ownership rules,
    /// and simple ID-based methods used internally where the controller already
    /// handles authorization.
    ///
    /// Amenities are stored as a comma-separated string in the database
    /// (e.g. "AC,WiFi,ChargingPort") and returned as a List&lt;string&gt; in responses.
    /// </summary>
    public class BusService : IBusService
    {
        private readonly IRepository<Bus> _buses;
        private readonly IRepository<BusOperator> _operators;
        private readonly IRepository<User> _users;

        public BusService(IRepository<Bus> buses, IRepository<BusOperator> operators, IRepository<User> users)
        {
            _buses     = buses;
            _operators = operators;
            _users     = users;
        }

        // ── Role-aware (secured) methods ──────────────────────────────────────

        /// <summary>
        /// Returns buses based on the caller's role:
        ///   - Admin   → returns every bus in the system.
        ///   - Operator → returns only the buses owned by that operator.
        ///                Returns an empty list if the operator has no profile yet.
        /// </summary>
        public async Task<IEnumerable<BusResponseDto>> GetAllSecuredAsync(Guid userId, string role, CancellationToken ct)
        {
            if (role == Roles.Admin)
            {
                var all = await _buses.GetAllAsync(ct);
                return all.Select(Map);
            }

            var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
            if (op == null) return Enumerable.Empty<BusResponseDto>();

            var list = await _buses.FindAsync(b => b.OperatorId == op.Id, ct);
            return list.Select(Map);
        }

        /// <summary>
        /// Fetches a single bus by ID, enforcing ownership:
        ///   - Admin   → can fetch any bus.
        ///   - Operator → can only fetch a bus they own; returns null for others' buses.
        /// Returns null if the bus does not exist.
        /// </summary>
        public async Task<BusResponseDto?> GetByIdSecuredAsync(Guid id, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            if (role == Roles.Admin) return Map(bus);

            var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
            if (op == null || bus.OperatorId != op.Id) return null;

            return Map(bus);
        }

        /// <summary>
        /// Updates a bus's registration number, type, seat count, status, and amenities.
        /// Enforces ownership:
        ///   - Admin   → can update any bus.
        ///   - Operator → can only update their own buses; returns null for others' buses.
        /// Returns null if the bus does not exist.
        /// </summary>
        public async Task<BusResponseDto?> UpdateSecuredAsync(Guid id, UpdateBusRequestDto dto, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            if (role != Roles.Admin)
            {
                var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
                if (op == null || bus.OperatorId != op.Id)
                    return null;
            }

            bus.RegistrationNumber = dto.RegistrationNumber.Trim();
            bus.BusType            = dto.BusType;
            bus.TotalSeats         = dto.TotalSeats;
            bus.Status             = dto.Status;
            bus.Amenities          = dto.Amenities.Count > 0 ? string.Join(",", dto.Amenities.Select(a => a.Trim())) : null;
            bus.UpdatedAtUtc       = DateTime.UtcNow;

            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        /// <summary>
        /// Updates only the operational status of a bus (Available / UnderRepair / NotAvailable).
        /// Useful when an operator wants to take a bus offline temporarily without changing other details.
        /// Enforces the same ownership rules as UpdateSecuredAsync.
        /// Returns null if the bus does not exist or the caller does not own it.
        /// </summary>
        public async Task<BusResponseDto?> UpdateStatusSecuredAsync(Guid id, BusStatus status, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            if (role != Roles.Admin)
            {
                var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
                if (op == null || bus.OperatorId != op.Id)
                    return null;
            }

            bus.Status       = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        /// <summary>
        /// Permanently deletes a bus from the database.
        /// Cascades to delete all schedules for that bus (configured in AppDbContext).
        /// Enforces ownership:
        ///   - Admin   → can delete any bus.
        ///   - Operator → can only delete their own buses; returns false for others' buses.
        /// Returns false if the bus does not exist.
        /// </summary>
        public async Task<bool> DeleteSecuredAsync(Guid id, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return false;

            if (role != Roles.Admin)
            {
                var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
                if (op == null || bus.OperatorId != op.Id)
                    return false;
            }

            await _buses.RemoveAsync(bus, ct);
            return true;
        }

        // ── Simple ID-based methods (no ownership check) ──────────────────────

        /// <summary>
        /// Returns all buses in the system without any role filtering.
        /// The controller is responsible for restricting access to the right roles.
        /// </summary>
        public async Task<IEnumerable<BusResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var list = await _buses.GetAllAsync(ct);
            return list.Select(Map);
        }

        /// <summary>
        /// Returns a single bus by its ID without any ownership check.
        /// Returns null if not found.
        /// </summary>
        public async Task<BusResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            return entity == null ? null : Map(entity);
        }

        /// <summary>
        /// Updates a bus's details by ID without any ownership check.
        /// Returns null if the bus does not exist.
        /// </summary>
        public async Task<BusResponseDto?> UpdateAsync(Guid id, UpdateBusRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return null;

            entity.RegistrationNumber = dto.RegistrationNumber.Trim();
            entity.BusType            = dto.BusType;
            entity.TotalSeats         = dto.TotalSeats;
            entity.Status             = dto.Status;
            entity.Amenities          = dto.Amenities.Count > 0 ? string.Join(",", dto.Amenities.Select(a => a.Trim())) : null;
            entity.UpdatedAtUtc       = DateTime.UtcNow;

            await _buses.UpdateAsync(entity, ct);
            return Map(entity);
        }

        /// <summary>
        /// Permanently deletes a bus by ID without any ownership check.
        /// Returns false if the bus does not exist.
        /// </summary>
        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return false;
            await _buses.RemoveAsync(entity, ct);
            return true;
        }

        /// <summary>
        /// Updates only the status of a bus by ID without any ownership check.
        /// Returns null if the bus does not exist.
        /// </summary>
        public async Task<BusResponseDto?> UpdateStatusAsync(Guid id, BusStatus status, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return null;

            entity.Status       = status;
            entity.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(entity, ct);
            return Map(entity);
        }

        // ── By-operator (key-based) methods ───────────────────────────────────

        /// <summary>
        /// Creates a new bus identified by operator username or company name instead of a GUID.
        /// Resolves the operator from the provided username or company name, then creates the bus.
        /// Throws InvalidOperationException if the bus code already exists for that operator.
        /// </summary>
        public async Task<BusResponseDto> CreateByOperatorAsync(CreateBusByOperatorDto dto, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(dto.OperatorUsername, dto.CompanyName, ct);

            var dup = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == dto.Code, ct)).Any();
            if (dup) throw new InvalidOperationException("Bus code already exists for this operator.");

            var e = new Bus
            {
                OperatorId         = opId,
                Code               = dto.Code.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                BusType            = dto.BusType,
                TotalSeats         = dto.TotalSeats,
                Status             = dto.Status,
                Amenities          = dto.Amenities.Count > 0 ? string.Join(",", dto.Amenities.Select(a => a.Trim())) : null
            };
            e = await _buses.AddAsync(e, ct);
            return Map(e);
        }

        /// <summary>
        /// Finds a bus by operator identity (username or company name) and bus code.
        /// Returns null if the operator or bus is not found.
        /// </summary>
        public async Task<BusResponseDto?> GetByCodeAsync(string opName, string busCode, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(opName, opName, ct);
            var bus  = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            return bus is null ? null : Map(bus);
        }

        /// <summary>
        /// Updates the status of a bus identified by operator identity and bus code.
        /// Returns null if the operator or bus is not found.
        /// </summary>
        public async Task<BusResponseDto?> UpdateStatusByCodeAsync(string opName, string busCode, BusStatus status, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(opName, opName, ct);
            var bus  = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            if (bus is null) return null;

            bus.Status       = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        /// <summary>
        /// Creates a new bus using a direct OperatorId (GUID-based).
        /// Throws InvalidOperationException if OperatorId is empty or the bus code already exists.
        /// </summary>
        public async Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default)
        {
            if (dto.OperatorId == Guid.Empty)
                throw new InvalidOperationException("OperatorId is required.");

            var dup = (await _buses.FindAsync(b => b.OperatorId == dto.OperatorId && b.Code == dto.Code, ct)).Any();
            if (dup) throw new InvalidOperationException("Bus code already exists for this operator.");

            var e = new Bus
            {
                OperatorId         = dto.OperatorId,
                Code               = dto.Code.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                BusType            = dto.BusType,
                TotalSeats         = dto.TotalSeats,
                Status             = dto.Status,
                Amenities          = dto.Amenities.Count > 0 ? string.Join(",", dto.Amenities.Select(a => a.Trim())) : null
            };
            e = await _buses.AddAsync(e, ct);
            return Map(e);
        }

        // ── Private helpers ───────────────────────────────────────────────────

        /// <summary>
        /// Resolves an operator's GUID from either their username or company name.
        /// Tries username first; falls back to company name if username is blank.
        /// Throws InvalidOperationException if neither resolves to a valid operator.
        /// </summary>
        private async Task<Guid> ResolveOperatorIdAsync(string? username, string? companyName, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(username))
            {
                var user = (await _users.FindAsync(u => u.Username == username, ct)).FirstOrDefault()
                           ?? throw new InvalidOperationException("Operator user not found.");

                var op = (await _operators.FindAsync(o => o.UserId == user.Id, ct)).FirstOrDefault()
                         ?? throw new InvalidOperationException("Operator profile not found.");

                return op.Id;
            }

            if (!string.IsNullOrWhiteSpace(companyName))
            {
                var op = (await _operators.FindAsync(o => o.CompanyName == companyName, ct)).FirstOrDefault()
                         ?? throw new InvalidOperationException("Operator with given company name not found.");

                return op.Id;
            }

            throw new InvalidOperationException("Provide OperatorUsername or CompanyName.");
        }

        /// <summary>
        /// Maps a Bus entity to a BusResponseDto.
        /// Splits the comma-separated Amenities string into a clean list,
        /// filtering out any empty entries.
        /// </summary>
        private static BusResponseDto Map(Bus e) => new()
        {
            Id                 = e.Id,
            OperatorId         = e.OperatorId,
            Code               = e.Code,
            RegistrationNumber = e.RegistrationNumber,
            BusType            = e.BusType,
            TotalSeats         = e.TotalSeats,
            Status             = e.Status,
            Amenities          = string.IsNullOrWhiteSpace(e.Amenities)
                ? new List<string>()
                : e.Amenities.Split(',', System.StringSplitOptions.RemoveEmptyEntries)
                             .Select(a => a.Trim())
                             .Where(a => a.Length > 0)
                             .ToList(),
            CreatedAtUtc = e.CreatedAtUtc,
            UpdatedAtUtc = e.UpdatedAtUtc
        };
    }
}
