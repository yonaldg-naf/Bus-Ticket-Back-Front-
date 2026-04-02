using BusTicketBooking.Dtos.Complaints;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class ComplaintServiceTests
{
    private static ComplaintService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db);

    /// <summary>
    /// Seeds a confirmed booking whose schedule has already departed (past departure).
    /// Returns the customer userId and the booking.
    /// </summary>
    private static (Guid customerId, Booking booking)
        SeedConfirmedPastBooking(BusTicketBooking.Contexts.AppDbContext db)
    {
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);

        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        db.SaveChanges();

        return (customer.Id, booking);
    }

    // ── RaiseAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Raise_CreatesComplaint_WhenBookingConfirmedAndDeparted()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (customerId, booking) = SeedConfirmedPastBooking(db);

        var dto = new CreateComplaintRequestDto { Message = "The bus was very dirty." };

        var result = await svc.RaiseAsync(customerId, booking.Id, dto);

        Assert.NotNull(result);
        Assert.Equal("The bus was very dirty.", result.Message);
        Assert.Equal("Open", result.Status);
        Assert.Equal(customerId, result.UserId);
    }

    [Fact]
    public async Task Raise_ThrowsNotFound_WhenBookingDoesNotBelongToUser()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, booking) = SeedConfirmedPastBooking(db);

        var dto = new CreateComplaintRequestDto { Message = "Some complaint." };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.RaiseAsync(Guid.NewGuid(), booking.Id, dto));
    }

    [Fact]
    public async Task Raise_ThrowsValidation_WhenBookingNotConfirmed()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);

        // Pending booking — not confirmed
        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Pending);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var dto = new CreateComplaintRequestDto { Message = "Some complaint." };

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.RaiseAsync(customer.Id, booking.Id, dto));
    }

    [Fact]
    public async Task Raise_ThrowsValidation_WhenTripHasNotDepartedYet()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        // Future departure
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(5));

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);

        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var dto = new CreateComplaintRequestDto { Message = "Pre-travel complaint." };

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.RaiseAsync(customer.Id, booking.Id, dto));
    }

    // ── GetMyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMy_ReturnsOnlyCurrentUsersComplaints()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (customer1Id, booking1) = SeedConfirmedPastBooking(db);
        var (customer2Id, booking2) = SeedConfirmedPastBooking(db);

        var dto = new CreateComplaintRequestDto { Message = "My complaint." };
        await svc.RaiseAsync(customer1Id, booking1.Id, dto);
        await svc.RaiseAsync(customer2Id, booking2.Id, dto);

        var results = (await svc.GetMyAsync(customer1Id)).ToList();

        Assert.Single(results);
        Assert.Equal(customer1Id, results[0].UserId);
    }

    [Fact]
    public async Task GetMy_ReturnsEmpty_WhenNoComplaints()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var results = await svc.GetMyAsync(Guid.NewGuid());

        Assert.Empty(results);
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Admin_ReturnsAllComplaints()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (c1Id, b1) = SeedConfirmedPastBooking(db);
        var (c2Id, b2) = SeedConfirmedPastBooking(db);

        var dto = new CreateComplaintRequestDto { Message = "Complaint." };
        await svc.RaiseAsync(c1Id, b1.Id, dto);
        await svc.RaiseAsync(c2Id, b2.Id, dto);

        var adminId = Guid.NewGuid();
        var results = (await svc.GetAllAsync(adminId, Roles.Admin)).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetAll_Operator_ReturnsOnlyOwnBusComplaints()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        // Operator 1 schedule
        var (op1, bus1, route1, schedule1) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));
        var customer1 = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer1);
        var booking1 = SeedHelper.MakeBooking(customer1.Id, schedule1.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking1);

        // Operator 2 schedule
        var (op2, bus2, route2, schedule2) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));
        var customer2 = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer2);
        var booking2 = SeedHelper.MakeBooking(customer2.Id, schedule2.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking2);

        await db.SaveChangesAsync();

        var dto = new CreateComplaintRequestDto { Message = "Complaint." };
        await svc.RaiseAsync(customer1.Id, booking1.Id, dto);
        await svc.RaiseAsync(customer2.Id, booking2.Id, dto);

        var results = (await svc.GetAllAsync(op1.UserId, Roles.Operator)).ToList();

        Assert.Single(results);
    }

    [Fact]
    public async Task GetAll_Operator_ReturnsEmpty_WhenNoOperatorProfile()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var results = await svc.GetAllAsync(Guid.NewGuid(), Roles.Operator);

        Assert.Empty(results);
    }

    // ── ReplyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Reply_Admin_CanReplyToAnyComplaint()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (customerId, booking) = SeedConfirmedPastBooking(db);

        var complaint = await svc.RaiseAsync(customerId, booking.Id, new CreateComplaintRequestDto { Message = "Issue." });

        var replyDto = new ReplyComplaintRequestDto { Reply = "We are sorry, issue resolved." };
        var result = await svc.ReplyAsync(Guid.NewGuid(), Roles.Admin, complaint.Id, replyDto);

        Assert.NotNull(result);
        Assert.Equal("We are sorry, issue resolved.", result!.Reply);
        Assert.Equal("Resolved", result.Status);
    }

    [Fact]
    public async Task Reply_Operator_CanReplyToOwnBusComplaint()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (op, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));
        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var complaint = await svc.RaiseAsync(customer.Id, booking.Id, new CreateComplaintRequestDto { Message = "Issue." });

        var replyDto = new ReplyComplaintRequestDto { Reply = "Operator reply." };
        var result = await svc.ReplyAsync(op.UserId, Roles.Operator, complaint.Id, replyDto);

        Assert.NotNull(result);
        Assert.Equal("Operator reply.", result!.Reply);
        Assert.Equal("Resolved", result.Status);
    }

    [Fact]
    public async Task Reply_Operator_ThrowsForbidden_WhenNotOwnBus()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));
        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var complaint = await svc.RaiseAsync(customer.Id, booking.Id, new CreateComplaintRequestDto { Message = "Issue." });

        // Different operator
        var (otherOp, _, _, _) = SeedHelper.SeedSchedule(db);

        var replyDto = new ReplyComplaintRequestDto { Reply = "Unauthorized reply." };

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            svc.ReplyAsync(otherOp.UserId, Roles.Operator, complaint.Id, replyDto));
    }

    [Fact]
    public async Task Reply_ThrowsNotFound_WhenComplaintDoesNotExist()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var replyDto = new ReplyComplaintRequestDto { Reply = "Reply." };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.ReplyAsync(Guid.NewGuid(), Roles.Admin, Guid.NewGuid(), replyDto));
    }
}
