using BusTicketBooking.Exceptions;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class OperatorApprovalServiceTests
{
    private static OperatorApprovalService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db);

    private static User SeedPendingOperator(BusTicketBooking.Contexts.AppDbContext db, string fullName = "John Doe")
    {
        var user = new User
        {
            Id           = Guid.NewGuid(),
            Username     = "pending_" + Guid.NewGuid().ToString()[..6],
            Email        = Guid.NewGuid().ToString()[..6] + "@test.com",
            FullName     = fullName,
            Role         = Roles.PendingOperator,
            PasswordHash = "hash"
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    // ── GetPendingAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetPending_ReturnsOnlyPendingOperators()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        SeedPendingOperator(db, "Alice");
        SeedPendingOperator(db, "Bob");

        // Add a regular customer — should not appear
        db.Users.Add(SeedHelper.MakeUser(Roles.Customer));
        await db.SaveChangesAsync();

        var results = (await svc.GetPendingAsync()).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetPending_ReturnsEmpty_WhenNoPendingOperators()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var results = await svc.GetPendingAsync();

        Assert.Empty(results);
    }

    // ── ApproveAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Approve_ChangesRoleToOperator_AndCreatesProfile()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var user = SeedPendingOperator(db, "Jane Smith");

        var dto = new ApproveOperatorDto
        {
            CompanyName  = "Jane's Travels",
            SupportPhone = "9876543210"
        };

        var result = (dynamic)(await svc.ApproveAsync(user.Id, dto));

        Assert.NotNull(result);

        var updatedUser = db.Users.Find(user.Id)!;
        Assert.Equal(Roles.Operator, updatedUser.Role);

        var profile = db.BusOperators.FirstOrDefault(o => o.UserId == user.Id);
        Assert.NotNull(profile);
        Assert.Equal("Jane's Travels", profile!.CompanyName);
        Assert.Equal("9876543210", profile.SupportPhone);
    }

    [Fact]
    public async Task Approve_UsesFullNameAsCompanyName_WhenCompanyNameNotProvided()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var user = SeedPendingOperator(db, "Mark Travels");

        var dto = new ApproveOperatorDto { CompanyName = null, SupportPhone = null };

        await svc.ApproveAsync(user.Id, dto);

        var profile = db.BusOperators.FirstOrDefault(o => o.UserId == user.Id);
        Assert.NotNull(profile);
        Assert.Equal("Mark Travels", profile!.CompanyName);
    }

    [Fact]
    public async Task Approve_ThrowsNotFound_WhenUserDoesNotExist()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.ApproveAsync(Guid.NewGuid(), new ApproveOperatorDto()));
    }

    [Fact]
    public async Task Approve_ThrowsValidation_WhenUserIsNotPendingOperator()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        // Regular customer
        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.ApproveAsync(customer.Id, new ApproveOperatorDto()));
    }

    [Fact]
    public async Task Approve_ThrowsValidation_WhenAlreadyApprovedOperator()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var user = SeedPendingOperator(db);

        // Approve once
        await svc.ApproveAsync(user.Id, new ApproveOperatorDto { CompanyName = "Co" });

        // Try to approve again — role is now Operator, not PendingOperator
        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.ApproveAsync(user.Id, new ApproveOperatorDto { CompanyName = "Co" }));
    }

    // ── RejectAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Reject_ChangesRoleToCustomer()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var user = SeedPendingOperator(db, "Rejected User");

        var result = (dynamic)(await svc.RejectAsync(user.Id));

        Assert.NotNull(result);

        var updatedUser = db.Users.Find(user.Id)!;
        Assert.Equal(Roles.Customer, updatedUser.Role);
    }

    [Fact]
    public async Task Reject_DoesNotCreateOperatorProfile()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var user = SeedPendingOperator(db);

        await svc.RejectAsync(user.Id);

        var profile = db.BusOperators.FirstOrDefault(o => o.UserId == user.Id);
        Assert.Null(profile);
    }

    [Fact]
    public async Task Reject_ThrowsNotFound_WhenUserDoesNotExist()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.RejectAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Reject_ThrowsValidation_WhenUserIsNotPendingOperator()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.RejectAsync(customer.Id));
    }
}
