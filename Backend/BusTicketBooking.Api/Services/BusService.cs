using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Repositories;

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

        // ===== Existing (Id-based) =====

        public async Task<BusResponseDto> CreateAsync(CreateBusRequestDto dto, CancellationToken ct = default)
        {
            var exists = (await _buses.FindAsync(b => b.OperatorId == dto.OperatorId && b.Code == dto.Code, ct)).Any();
            if (exists) throw new InvalidOperationException("Bus code already exists for this operator.");

            var entity = new Bus
            {
                OperatorId = dto.OperatorId,
                Code = dto.Code.Trim(),
                RegistrationNumber = dto.RegistrationNumber.Trim(),
                BusType = dto.BusType,
                TotalSeats = dto.TotalSeats,
                Status = dto.Status
            };
            entity = await _buses.AddAsync(entity, ct);
            return Map(entity);
        }

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

        // ===== NEW (by-keys) =====

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

        public async Task<BusResponseDto?> GetByCodeAsync(string operatorUsernameOrCompany, string busCode, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var bus = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            return bus is null ? null : Map(bus);
        }

        public async Task<BusResponseDto?> UpdateStatusByCodeAsync(string operatorUsernameOrCompany, string busCode, BusStatus status, CancellationToken ct = default)
        {
            var opId = await ResolveOperatorIdAsync(operatorUsernameOrCompany, operatorUsernameOrCompany, ct);
            var bus = (await _buses.FindAsync(b => b.OperatorId == opId && b.Code == busCode, ct)).FirstOrDefault();
            if (bus is null) return null;

            bus.Status = status;
            bus.UpdatedAtUtc = DateTime.UtcNow;
            await _buses.UpdateAsync(bus, ct);
            return Map(bus);
        }

        // ===== Helpers =====

        private async Task<Guid> ResolveOperatorIdAsync(string? username, string? companyName, CancellationToken ct)
        {
            // Prefer username if provided
            if (!string.IsNullOrWhiteSpace(username))
            {
                var user = (await _users.FindAsync(u => u.Username == username, ct)).FirstOrDefault()
                           ?? throw new InvalidOperationException("Operator user not found.");
                var op = (await _operators.FindAsync(o => o.UserId == user.Id, ct)).FirstOrDefault()
                         ?? throw new InvalidOperationException("Operator profile not found for user.");
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
    }
}
