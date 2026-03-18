using BusTicketBooking.Contexts;
using BusTicketBooking.Dtos.Bus;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

public class BusServiceTests
{
    private readonly Mock<IRepository<Bus>> _busRepo = new();
    private readonly Mock<IRepository<BusOperator>> _opRepo = new();
    private readonly Mock<IRepository<User>> _userRepo = new();

    private BusService CreateSUT() =>
        new BusService(_busRepo.Object, _opRepo.Object, _userRepo.Object);

    // ---------------------------------------------------------------
    // GET ALL (SECURED)
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetAllSecured_Admin_ReturnsAll()
    {
        _busRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Bus>
            {
                new Bus { Code = "A" },
                new Bus { Code = "B" }
            });

        var sut = CreateSUT();

        var result = await sut.GetAllSecuredAsync(Guid.NewGuid(), Roles.Admin, default);

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetAllSecured_OperatorWithoutProfile_ReturnsEmpty()
    {
        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BusOperator>());

        var sut = CreateSUT();

        var result = await sut.GetAllSecuredAsync(Guid.NewGuid(), Roles.Operator, default);

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllSecured_Operator_ReturnsOwnedBuses()
    {
        var userId = Guid.NewGuid();
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = userId };

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { op });

        _busRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<Bus, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new Bus { OperatorId = op.Id, Code = "A1" } });

        var sut = CreateSUT();

        var result = await sut.GetAllSecuredAsync(userId, Roles.Operator, default);

        Assert.Single(result);
    }

    // ---------------------------------------------------------------
    // GET BY ID (SECURED)
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetByIdSecured_Admin_Success()
    {
        var id = Guid.NewGuid();

        _busRepo.Setup(r => r.GetByIdAsync(id, default))
            .ReturnsAsync(new Bus { Id = id, Code = "B1" });

        var sut = CreateSUT();
        var result = await sut.GetByIdSecuredAsync(id, Guid.NewGuid(), Roles.Admin, default);

        Assert.NotNull(result);
        Assert.Equal("B1", result.Code);
    }

    [Fact]
    public async Task GetByIdSecured_WrongOperator_ReturnsNull()
    {
        var id = Guid.NewGuid();

        _busRepo.Setup(r => r.GetByIdAsync(id, default))
            .ReturnsAsync(new Bus { Id = id, OperatorId = Guid.NewGuid() });

        // Operator profile mismatch
        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BusOperator>());

        var sut = CreateSUT();
        var result = await sut.GetByIdSecuredAsync(id, Guid.NewGuid(), Roles.Operator, default);

        Assert.Null(result);
    }

    // ---------------------------------------------------------------
    // UPDATE (SECURED)
    // ---------------------------------------------------------------

    [Fact]
    public async Task UpdateSecured_Admin_Success()
    {
        var id = Guid.NewGuid();
        var bus = new Bus { Id = id, OperatorId = Guid.NewGuid() };

        _busRepo.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(bus);

        var sut = CreateSUT();

        var dto = new UpdateBusRequestDto
        {
            RegistrationNumber = "RN",
            BusType = BusType.AC,
            TotalSeats = 50,
            Status = BusStatus.UnderRepair
        };

        var result = await sut.UpdateSecuredAsync(id, dto, Guid.NewGuid(), Roles.Admin, default);

        Assert.NotNull(result);
        Assert.Equal("RN", result.RegistrationNumber);
        _busRepo.Verify(r => r.UpdateAsync(bus, default), Times.Once);
    }

    [Fact]
    public async Task UpdateSecured_NonOwnerOperator_ReturnsNull()
    {
        var id = Guid.NewGuid();
        var bus = new Bus { Id = id, OperatorId = Guid.NewGuid() };

        _busRepo.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(bus);

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BusOperator>()); // not owner

        var sut = CreateSUT();

        var result = await sut.UpdateSecuredAsync(id, new UpdateBusRequestDto(), Guid.NewGuid(), Roles.Operator, default);

        Assert.Null(result);
    }

    // ---------------------------------------------------------------
    // UPDATE STATUS (SECURED)
    // ---------------------------------------------------------------

    [Fact]
    public async Task UpdateStatusSecured_OperatorOwner_Success()
    {
        var userId = Guid.NewGuid();
        var op = new BusOperator { Id = Guid.NewGuid(), UserId = userId };

        var bus = new Bus { Id = Guid.NewGuid(), OperatorId = op.Id, Status = BusStatus.Available };

        _busRepo.Setup(r => r.GetByIdAsync(bus.Id, default)).ReturnsAsync(bus);

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { op });

        var sut = CreateSUT();

        var result = await sut.UpdateStatusSecuredAsync(bus.Id, BusStatus.NotAvailable, userId, Roles.Operator, default);

        Assert.NotNull(result);
        Assert.Equal(BusStatus.NotAvailable, result.Status);
    }

    // ---------------------------------------------------------------
    // DELETE (SECURED)
    // ---------------------------------------------------------------

    [Fact]
    public async Task DeleteSecured_Admin_Success()
    {
        var id = Guid.NewGuid();
        var bus = new Bus { Id = id };

        _busRepo.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(bus);

        var sut = CreateSUT();

        var ok = await sut.DeleteSecuredAsync(id, Guid.NewGuid(), Roles.Admin, default);

        Assert.True(ok);
        _busRepo.Verify(r => r.RemoveAsync(bus, default), Times.Once);
    }

    [Fact]
    public async Task DeleteSecured_NonOwner_ReturnsFalse()
    {
        var id = Guid.NewGuid();
        var bus = new Bus { Id = id, OperatorId = Guid.NewGuid() };

        _busRepo.Setup(r => r.GetByIdAsync(id, default)).ReturnsAsync(bus);

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<BusOperator>()); // not owner

        var sut = CreateSUT();

        var ok = await sut.DeleteSecuredAsync(id, Guid.NewGuid(), Roles.Operator, default);

        Assert.False(ok);
    }

    // ---------------------------------------------------------------
    // CREATE BY OPERATOR
    // ---------------------------------------------------------------

    [Fact]
    public async Task CreateByOperatorAsync_DuplicateBusCode_Throws()
    {
        var opId = Guid.NewGuid();
        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = opId, UserId = user.Id };

        _userRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { user });

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { op });

        _busRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<Bus, bool>>>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new Bus { Code = "DUP", OperatorId = opId } });

        var sut = CreateSUT();

        var dto = new CreateBusByOperatorDto
        {
            OperatorUsername = "op",
            Code = "DUP",
            RegistrationNumber = "RN1",
            BusType = BusType.Sleeper,
            TotalSeats = 40
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateByOperatorAsync(dto, default));
    }

    // ---------------------------------------------------------------
    // GET BY CODE
    // ---------------------------------------------------------------

    [Fact]
    public async Task GetByCodeAsync_ReturnsBus()
    {
        var db = new Mock<AppDbContext>(); // not needed—using mocks only

        var opId = Guid.NewGuid();

        // Required for ResolveOperatorIdAsync
        var user = new User { Id = Guid.NewGuid(), Username = "op" };
        var op = new BusOperator { Id = opId, UserId = user.Id };

        _userRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<User, bool>>>(),
            It.IsAny<CancellationToken>())
        ).ReturnsAsync(new[] { user });

        _opRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<BusOperator, bool>>>(),
            It.IsAny<CancellationToken>())
        ).ReturnsAsync(new[] { op });

        var bus = new Bus { OperatorId = opId, Code = "B1" };

        _busRepo.Setup(r => r.FindAsync(
            It.IsAny<Expression<Func<Bus, bool>>>(),
            It.IsAny<CancellationToken>())
        ).ReturnsAsync(new[] { bus });

        var sut = CreateSUT();

        var result = await sut.GetByCodeAsync("op", "B1");

        Assert.NotNull(result);
        Assert.Equal("B1", result.Code);
    }
}