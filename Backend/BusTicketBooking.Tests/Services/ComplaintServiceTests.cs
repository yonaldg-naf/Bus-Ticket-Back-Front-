using BusTicketBooking.Dtos.Complaints;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class ComplaintServiceTests
{
    private static ComplaintService Build(BusTicketBooking.Contexts.AppDbContext db) => new(db);

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
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (customerId, booking) = SeedConfirmedPastBooking(db);

        var result = await svc.RaiseAsync(customerId, booking.Id, new CreateComplaintRequestDto { Message = "Bus was dirty." });

        Assert.NotNull(result);
        Assert.Equal("Bus was dirty.", result.Message);
        Assert.Equal("Open", result.Status);
        Assert.Equal(customerId, result.UserId);
    }

    [Fact]
    public async Task Raise_ThrowsNotFound_WhenBookingDoesNotBelongToUser()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, booking) = SeedConfirmedPastBooking(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.RaiseAsync(Guid.NewGuid(), booking.Id, new CreateComplaintRequestDto { Message = "X" }));
    }

    [Fact]
    public async Task Raise_ThrowsValidation_WhenBookingNotConfirmed()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-2));

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Pending);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.RaiseAsync(customer.Id, booking.Id, new CreateComplaintRequestDto { Message = "X" }));
    }

    [Fact]
    public async Task Raise_ThrowsValidation_WhenTripHasNotDepartedYet()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(5));

        var customer = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(customer);
        var booking = SeedHelper.MakeBooking(customer.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.RaiseAsync(customer.Id, booking.Id, new CreateComplaintRequestDto { Message = "X" }));
    }

    // ── GetMyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMy_ReturnsOnlyCurrentUsersComplaints()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var (c1Id, b1) = SeedConfirmedPastBooking(db);
        var (c2Id, b2) = SeedConfirmedPastBooking(db);

        await svc.RaiseAsync(c1Id, b1.Id, new CreateComplaintRequestDto { Message = "C1" });
        await svc.RaiseAsync(c2Id, b2.Id, new CreateComplaintRequestDto { Message = "C2" });

        var results = (await svc.GetMyAsync(c1Id)).ToList();

        Assert.Single(results);
        Assert.Equal(c1Id, results[0].UserId);
    }

    [Fact]
    public async Task GetMy_ReturnsEmpty_WhenNoComplaints()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        Assert.Empty(await svc.GetMyAsync(Guid.NewGuid()));
    }

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllComplaints()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        var (c1Id, b1) = SeedConfirmedPastBooking(db);
        var (c2Id, b2) = SeedConfirmedPastBooking(db);

        await svc.RaiseAsync(c1Id, b1.Id, new CreateComplaintRequestDto { Message = "C1" });
        await svc.RaiseAsync(c2Id, b2.Id, new CreateComplaintRequestDto { Message = "C2" });

        var results = (await svc.GetAllAsync()).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetAll_ReturnsEmpty_WhenNoComplaints()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        Assert.Empty(await svc.GetAllAsync());
    }

    // ── ReplyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Reply_SetsReplyAndResolved()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);
        var (customerId, booking) = SeedConfirmedPastBooking(db);

        var complaint = await svc.RaiseAsync(customerId, booking.Id, new CreateComplaintRequestDto { Message = "Issue." });

        var result = await svc.ReplyAsync(complaint.Id, new ReplyComplaintRequestDto { Reply = "Resolved for you." });

        Assert.NotNull(result);
        Assert.Equal("Resolved for you.", result!.Reply);
        Assert.Equal("Resolved", result.Status);
    }

    [Fact]
    public async Task Reply_ThrowsNotFound_WhenComplaintDoesNotExist()
    {
        var db  = DbHelper.CreateDb();
        var svc = Build(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.ReplyAsync(Guid.NewGuid(), new ReplyComplaintRequestDto { Reply = "X" }));
    }
}
