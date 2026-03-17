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
    public class BusService : IBusService
    {
        private readonly IRepository<Bus> _buses;
        private readonly IRepository<BusOperator> _operators;
        private readonly IRepository<User> _users;

        public BusService(IRepository<Bus> buses, IRepository<BusOperator> operators, IRepository<User> users)
        {
            _buses = buses;
            _operators = operators;
            _users = users;
        }

        // ------------------------------------------------------------------------------------
        // SECURED: GetAll — admin sees all, operator sees only own buses
        // ------------------------------------------------------------------------------------
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

        // ------------------------------------------------------------------------------------
        // SECURED: GetById — operator allowed ONLY if owns it
        // ------------------------------------------------------------------------------------
        public async Task<BusResponseDto?> GetByIdSecuredAsync(Guid id, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            if (role == Roles.Admin) return Map(bus);

            var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
            if (op == null || bus.OperatorId != op.Id) return null;

            return Map(bus);
        }

        // ------------------------------------------------------------------------------------
        // SECURED UPDATE
        // ------------------------------------------------------------------------------------
        public async Task<BusResponseDto?> UpdateSecuredAsync(Guid id, UpdateBusRequestDto dto, Guid userId, string role, CancellationToken ct)
        {
            var bus = await _buses.GetByIdAsync(id, ct);
            if (bus == null) return null;

            // Only admin or bus owner
            if (role != Roles.Admin)
            {
                var op = (await _operators.FindAsync(o => o.UserId == userId, ct)).FirstOrDefault();
                if (op == null || bus.OperatorId != op.Id)
                    return null;
            }

            bus.RegistrationNumber = dto.RegistrationNumber.Trim();
            bus.BusType = dto.BusType;
            bus.TotalSeats = dto.TotalSeats;
            bus.Status = dto.Status;
            bus.UpdatedAtUtc = DateTime.UtcNow;

            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        // ------------------------------------------------------------------------------------
        // SECURED UPDATE STATUS
        // ------------------------------------------------------------------------------------
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

            bus.Status = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        // ------------------------------------------------------------------------------------
        // SECURED DELETE
        // ------------------------------------------------------------------------------------
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

        // ============================================================
        // Existing ORIGINAL ID-based methods (unchanged internal use)
        // ============================================================

        public async Task<IEnumerable<BusResponseDto>> GetAllAsync(CancellationToken ct = default)
        {
            var list = await _buses.GetAllAsync(ct);
            return list.Select(Map);
        }

        public async Task<BusResponseDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            return entity == null ? null : Map(entity);
        }

        public async Task<BusResponseDto?> UpdateAsync(Guid id, UpdateBusRequestDto dto, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return null;

            entity.RegistrationNumber = dto.RegistrationNumber.Trim();
            entity.BusType = dto.BusType;
            entity.TotalSeats = dto.TotalSeats;
            entity.Status = dto.Status;
            entity.UpdatedAtUtc = DateTime.UtcNow;

            await _buses.UpdateAsync(entity, ct);
            return Map(entity);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return false;
            await _buses.RemoveAsync(entity, ct);
            return true;
        }

        public async Task<BusResponseDto?> UpdateStatusAsync(Guid id, BusStatus status, CancellationToken ct = default)
        {
            var entity = await _buses.GetByIdAsync(id, ct);
            if (entity == null) return null;

            entity.Status = status;
            entity.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(entity, ct);
            return Map(entity);
        }

        // ============================================================
        // by-operator
        // ============================================================

        public async Task<BusResponseDto> CreateByOperatorAsync(CreateBusByOperatorDto dto, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(dto.OperatorUsername, dto.CompanyName, ct);

            var dup = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == dto.Code, ct)).Any();
            if (dup) throw new InvalidOperationException("Bus code already exists for this operator.");

            var e = new Bus
            {
                OperatorId = opId,
                Code = dto.Code.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                BusType = dto.BusType,
                TotalSeats = dto.TotalSeats,
                Status = dto.Status
            };
            e = await _buses.AddAsync(e, ct);
            return Map(e);
        }

        public async Task<BusResponseDto?> GetByCodeAsync(string opName, string busCode, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(opName, opName, ct);
            var bus = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            return bus is null ? null : Map(bus);
        }

        public async Task<BusResponseDto?> UpdateStatusByCodeAsync(string opName, string busCode, BusStatus status, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(opName, opName, ct);
            var bus = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            if (bus is null) return null;

            bus.Status = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        // ============================================================
        // Helpers
        // ============================================================

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

        private static BusResponseDto Map(Bus e) => new()
        {
            Id = e.Id,
            OperatorId = e.OperatorId,
            Code = e.Code,
            RegistrationNumber = e.RegistrationNumber,
            BusType = e.BusType,
            TotalSeats = e.TotalSeats,
            Status = e.Status,
            CreatedAtUtc = e.CreatedAtUtc,
            UpdatedAtUtc = e.UpdatedAtUtc
        };

        public Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default)
        {
            throw new NotImplementedException();
        }
    }
}
