using BusTicketBooking.Dtos.Reviews;
using BusTicketBooking.Exceptions;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;
using BusTicketBooking.Services;
using BusTicketBooking.Tests.Helpers;

namespace BusTicketBooking.Tests.Services;

public class ReviewServiceTests
{
    private static ReviewService Build(BusTicketBooking.Contexts.AppDbContext db)
        => new(db);

    /// <summary>Seeds a confirmed booking with a past departure so reviews are allowed.</summary>
    private static (Guid userId, Booking booking, BusSchedule schedule)
        SeedConfirmedPastBooking(BusTicketBooking.Contexts.AppDbContext db)
    {
        var (_, bus, route, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(-3));

        var user = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(user);

        var booking = SeedHelper.MakeBooking(user.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        db.SaveChanges();

        return (user.Id, booking, schedule);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ReturnsReview_WhenBookingConfirmedAndDeparted()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (userId, booking, _) = SeedConfirmedPastBooking(db);

        var dto = new CreateReviewRequestDto
        {
            BookingId = booking.Id,
            Rating    = 4,
            Comment   = "Good trip overall."
        };

        var result = await svc.CreateAsync(userId, dto);

        Assert.NotNull(result);
        Assert.Equal(4, result.Rating);
        Assert.Equal("Good trip overall.", result.Comment);
    }

    [Fact]
    public async Task Create_ThrowsNotFound_WhenBookingDoesNotBelongToUser()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, booking, _) = SeedConfirmedPastBooking(db);

        var dto = new CreateReviewRequestDto { BookingId = booking.Id, Rating = 3 };

        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.CreateAsync(Guid.NewGuid(), dto));
    }

    [Fact]
    public async Task Create_ThrowsConflict_WhenBookingNotConfirmed()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedConfirmedPastBooking(db);

        var user = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(user);

        // Pending booking
        var booking = SeedHelper.MakeBooking(user.Id, schedule.Id, BookingStatus.Pending);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var dto = new CreateReviewRequestDto { BookingId = booking.Id, Rating = 5 };

        await Assert.ThrowsAsync<ConflictException>(() =>
            svc.CreateAsync(user.Id, dto));
    }

    [Fact]
    public async Task Create_ThrowsConflict_WhenTripHasNotDepartedYet()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        // Future departure
        var (_, _, _, schedule) = SeedHelper.SeedSchedule(db, departure: DateTime.UtcNow.AddHours(5));
        var user = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(user);
        var booking = SeedHelper.MakeBooking(user.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var dto = new CreateReviewRequestDto { BookingId = booking.Id, Rating = 5 };

        await Assert.ThrowsAsync<ConflictException>(() =>
            svc.CreateAsync(user.Id, dto));
    }

    [Fact]
    public async Task Create_ThrowsConflict_WhenReviewAlreadyExists()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (userId, booking, _) = SeedConfirmedPastBooking(db);

        var dto = new CreateReviewRequestDto { BookingId = booking.Id, Rating = 5 };

        await svc.CreateAsync(userId, dto);

        // Second review for same booking
        await Assert.ThrowsAsync<ConflictException>(() =>
            svc.CreateAsync(userId, dto));
    }

    // ── GetByScheduleAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetBySchedule_ReturnsAllReviewsForSchedule()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);

        var (_, _, schedule) = SeedConfirmedPastBooking(db);

        // Two different users reviewing the same schedule
        var user2 = SeedHelper.MakeUser(Roles.Customer);
        db.Users.Add(user2);
        var booking2 = SeedHelper.MakeBooking(user2.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.Add(booking2);
        await db.SaveChangesAsync();

        // First user's booking was already seeded; get it
        var booking1 = db.Bookings.First(b => b.ScheduleId == schedule.Id && b.UserId != user2.Id);

        await svc.CreateAsync(booking1.UserId, new CreateReviewRequestDto { BookingId = booking1.Id, Rating = 4 });
        await svc.CreateAsync(user2.Id, new CreateReviewRequestDto { BookingId = booking2.Id, Rating = 3 });

        var results = (await svc.GetByScheduleAsync(schedule.Id)).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetBySchedule_ReturnsEmpty_WhenNoReviews()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedConfirmedPastBooking(db);

        var results = await svc.GetByScheduleAsync(schedule.Id);

        Assert.Empty(results);
    }

    // ── GetSummaryAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetSummary_ReturnsCorrectAverageAndCounts()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedConfirmedPastBooking(db);

        // Seed two more users with bookings on the same schedule
        var user2 = SeedHelper.MakeUser(Roles.Customer);
        var user3 = SeedHelper.MakeUser(Roles.Customer);
        db.Users.AddRange(user2, user3);
        var b2 = SeedHelper.MakeBooking(user2.Id, schedule.Id, BookingStatus.Confirmed);
        var b3 = SeedHelper.MakeBooking(user3.Id, schedule.Id, BookingStatus.Confirmed);
        db.Bookings.AddRange(b2, b3);
        await db.SaveChangesAsync();

        var b1 = db.Bookings.First(b => b.ScheduleId == schedule.Id && b.UserId != user2.Id && b.UserId != user3.Id);

        await svc.CreateAsync(b1.UserId, new CreateReviewRequestDto { BookingId = b1.Id, Rating = 5 });
        await svc.CreateAsync(user2.Id,  new CreateReviewRequestDto { BookingId = b2.Id,  Rating = 3 });
        await svc.CreateAsync(user3.Id,  new CreateReviewRequestDto { BookingId = b3.Id,  Rating = 4 });

        var summary = await svc.GetSummaryAsync(schedule.Id);

        Assert.Equal(3, summary.TotalReviews);
        Assert.Equal(4.0, summary.AverageRating); // (5+3+4)/3 = 4.0
        Assert.Equal(1, summary.StarCounts[4]); // 5-star count at index 4
        Assert.Equal(1, summary.StarCounts[2]); // 3-star count at index 2
        Assert.Equal(1, summary.StarCounts[3]); // 4-star count at index 3
    }

    [Fact]
    public async Task GetSummary_ReturnsZeroAverage_WhenNoReviews()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (_, _, schedule) = SeedConfirmedPastBooking(db);

        var summary = await svc.GetSummaryAsync(schedule.Id);

        Assert.Equal(0, summary.AverageRating);
        Assert.Equal(0, summary.TotalReviews);
    }

    // ── GetMyReviewAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetMyReview_ReturnsReview_WhenExists()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (userId, booking, _) = SeedConfirmedPastBooking(db);

        await svc.CreateAsync(userId, new CreateReviewRequestDto { BookingId = booking.Id, Rating = 5, Comment = "Great!" });

        var result = await svc.GetMyReviewAsync(userId, booking.Id);

        Assert.NotNull(result);
        Assert.Equal(5, result!.Rating);
        Assert.Equal("Great!", result.Comment);
    }

    [Fact]
    public async Task GetMyReview_ReturnsNull_WhenNoReviewExists()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (userId, booking, _) = SeedConfirmedPastBooking(db);

        var result = await svc.GetMyReviewAsync(userId, booking.Id);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetMyReview_ReturnsNull_WhenWrongUser()
    {
        var db = DbHelper.CreateDb();
        var svc = Build(db);
        var (userId, booking, _) = SeedConfirmedPastBooking(db);

        await svc.CreateAsync(userId, new CreateReviewRequestDto { BookingId = booking.Id, Rating = 4 });

        var result = await svc.GetMyReviewAsync(Guid.NewGuid(), booking.Id);

        Assert.Null(result);
    }
}
