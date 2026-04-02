using BusTicketBooking.Exceptions;
using BusTicketBooking.Models;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class AnnouncementServiceTests
{
    private static AnnouncementService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db);

    // Helper: read a property from an anonymous-type object via reflection
    private static T Prop<T>(object obj, string name)
        => (T)obj.GetType().GetProperty(name)!.GetValue(obj)!;

    private static (Guid opUserId, BusSchedule schedule, BusOperator op)
        SeedOperatorSchedule(BusTicketBooking.Contexts.AppDbContext db)
    {
        var (op, _, _, schedule) = SeedHelper.SeedSchedule(db);
        return (op.UserId, schedule, op);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidOperatorAndSchedule_ReturnsAnnouncement()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule, _) = SeedOperatorSchedule(db);

        var dto = new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule.Id,
            Message    = "Bus will be 30 minutes late.",
            Type       = "Delay"
        };

        var result = await svc.CreateAsync(opUserId, dto);

        Assert.NotNull(result);
        Assert.Equal("Bus will be 30 minutes late.", Prop<string>(result, "message"));
        Assert.Equal("Delay", Prop<string>(result, "type"));
    }

    [Fact]
    public async Task Create_DefaultsTypeToInfo_WhenTypeNotProvided()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule, _) = SeedOperatorSchedule(db);

        var dto = new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule.Id,
            Message    = "Platform changed to 3.",
            Type       = null
        };

        var result = await svc.CreateAsync(opUserId, dto);

        Assert.Equal("Info", Prop<string>(result, "type"));
    }

    [Fact]
    public async Task Create_ThrowsForbidden_WhenOperatorProfileNotFound()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, schedule, _) = SeedOperatorSchedule(db);

        var dto = new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule.Id,
            Message    = "Test"
        };

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            svc.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task Create_ThrowsNotFound_WhenScheduleDoesNotExist()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, _, _) = SeedOperatorSchedule(db);

        var dto = new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = Guid.NewGuid(),
            Message    = "Test"
        };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.CreateAsync(opUserId, dto));
    }

    [Fact]
    public async Task Create_ThrowsForbidden_WhenOperatorDoesNotOwnSchedule()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (op1UserId, _, _) = SeedOperatorSchedule(db);
        var (_, schedule2, _) = SeedOperatorSchedule(db);

        var dto = new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule2.Id,
            Message    = "Trying to post on someone else's schedule"
        };

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            svc.CreateAsync(op1UserId, dto));
    }

    // ── GetByScheduleAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetBySchedule_ReturnsAllAnnouncementsForSchedule()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule, _) = SeedOperatorSchedule(db);

        await svc.CreateAsync(opUserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto { ScheduleId = schedule.Id, Message = "Msg 1" });
        await svc.CreateAsync(opUserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto { ScheduleId = schedule.Id, Message = "Msg 2" });

        var results = (await svc.GetByScheduleAsync(schedule.Id)).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetBySchedule_ReturnsEmpty_WhenNoAnnouncements()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, schedule, _) = SeedOperatorSchedule(db);

        var results = await svc.GetByScheduleAsync(schedule.Id);

        Assert.Empty(results);
    }

    // ── GetMyAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMy_ReturnsOnlyOperatorsOwnAnnouncements()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (op1UserId, schedule1, _) = SeedOperatorSchedule(db);
        var (op2UserId, schedule2, _) = SeedOperatorSchedule(db);

        await svc.CreateAsync(op1UserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto { ScheduleId = schedule1.Id, Message = "Op1 msg" });
        await svc.CreateAsync(op2UserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto { ScheduleId = schedule2.Id, Message = "Op2 msg" });

        var op1Results = (await svc.GetMyAsync(op1UserId)).ToList();

        Assert.Single(op1Results);
    }

    [Fact]
    public async Task GetMy_ReturnsEmpty_WhenOperatorHasNoProfile()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var results = await svc.GetMyAsync(Guid.NewGuid());

        Assert.Empty(results);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_RemovesAnnouncement_WhenOwner()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, schedule, _) = SeedOperatorSchedule(db);

        var created = await svc.CreateAsync(opUserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule.Id,
            Message    = "To be deleted"
        });

        Guid annId = Prop<Guid>(created, "id");
        var deleted = await svc.DeleteAsync(opUserId, annId);

        Assert.True(deleted);
        Assert.Empty(db.Announcements.ToList());
    }

    [Fact]
    public async Task Delete_ThrowsNotFound_WhenAnnouncementDoesNotExist()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (opUserId, _, _) = SeedOperatorSchedule(db);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.DeleteAsync(opUserId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Delete_ThrowsForbidden_WhenNotOwner()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (op1UserId, schedule1, _) = SeedOperatorSchedule(db);
        var (op2UserId, _, _)         = SeedOperatorSchedule(db);

        var created = await svc.CreateAsync(op1UserId, new BusTicketBooking.Interfaces.CreateAnnouncementDto
        {
            ScheduleId = schedule1.Id,
            Message    = "Op1 announcement"
        });

        Guid annId = Prop<Guid>(created, "id");

        await Assert.ThrowsAsync<ForbiddenException>(() =>
            svc.DeleteAsync(op2UserId, annId));
    }
}
