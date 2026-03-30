using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Tests.Helpers
{
    /// <summary>
    /// Builds common test entities so each test file doesn't repeat the same setup code.
    /// </summary>
    public static class SeedHelper
    {
        // ── Users ─────────────────────────────────────────────────────────────

        public static User MakeUser(string role = Roles.Customer)
            => new User
            {
                Id           = Guid.NewGuid(),
                Username     = "testuser_" + Guid.NewGuid().ToString()[..6],
                Email        = "test@example.com",
                FullName     = "Test User",
                Role         = role,
                PasswordHash = "hash"
            };

        // ── Operator ──────────────────────────────────────────────────────────

        public static BusOperator MakeOperator(Guid userId)
            => new BusOperator
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                CompanyName = "Test Bus Co",
                SupportPhone = "9999999999"
            };

        // ── Bus ───────────────────────────────────────────────────────────────

        public static Bus MakeBus(Guid operatorId, BusStatus status = BusStatus.Available, int seats = 40)
            => new Bus
            {
                Id                 = Guid.NewGuid(),
                OperatorId         = operatorId,
                Code               = "BUS-" + Guid.NewGuid().ToString()[..4].ToUpper(),
                RegistrationNumber = "MH12AB1234",
                BusType            = BusType.Seater,
                TotalSeats         = seats,
                Status             = status
            };

        // ── Route ─────────────────────────────────────────────────────────────

        public static BusRoute MakeRoute(Guid operatorId)
            => new BusRoute
            {
                Id          = Guid.NewGuid(),
                OperatorId  = operatorId,
                RouteCode   = "RT-" + Guid.NewGuid().ToString()[..4].ToUpper()
            };

        // ── Schedule ──────────────────────────────────────────────────────────

        public static BusSchedule MakeSchedule(Guid busId, Guid routeId,
            DateTime? departure = null, decimal price = 500m, bool cancelled = false)
            => new BusSchedule
            {
                Id                    = Guid.NewGuid(),
                BusId                 = busId,
                RouteId               = routeId,
                DepartureUtc          = departure ?? DateTime.UtcNow.AddHours(24),
                BasePrice             = price,
                IsCancelledByOperator = cancelled
            };

        // ── Booking ───────────────────────────────────────────────────────────

        public static Booking MakeBooking(Guid userId, Guid scheduleId,
            BookingStatus status = BookingStatus.Pending, decimal amount = 500m)
            => new Booking
            {
                Id          = Guid.NewGuid(),
                UserId      = userId,
                ScheduleId  = scheduleId,
                Status      = status,
                TotalAmount = amount,
                DiscountAmount = 0
            };

        // ── Payment ───────────────────────────────────────────────────────────

        public static Payment MakePayment(Guid bookingId,
            PaymentStatus status = PaymentStatus.Initiated, decimal amount = 500m)
            => new Payment
            {
                Id                = Guid.NewGuid(),
                BookingId         = bookingId,
                Amount            = amount,
                Status            = status,
                ProviderReference = "TEST"
            };

        // ── Wallet ────────────────────────────────────────────────────────────

        public static Wallet MakeWallet(Guid userId, decimal balance = 1000m)
            => new Wallet
            {
                Id      = Guid.NewGuid(),
                UserId  = userId,
                Balance = balance
            };

        // ── Promo Code ────────────────────────────────────────────────────────

        public static PromoCode MakePromo(Guid operatorId,
            string code = "SAVE10", int discountType = 1, decimal discountValue = 100m,
            int maxUses = 10, int usedCount = 0, decimal? minAmount = null)
            => new PromoCode
            {
                Id            = Guid.NewGuid(),
                OperatorId    = operatorId,
                Code          = code,
                DiscountType  = discountType,
                DiscountValue = discountValue,
                MaxUses       = maxUses,
                UsedCount     = usedCount,
                IsActive      = true,
                ExpiresAtUtc  = DateTime.UtcNow.AddDays(30),
                MinBookingAmount = minAmount
            };

        // ── Seed a full scenario (operator + bus + route + schedule) ──────────

        public static (BusOperator op, Bus bus, BusRoute route, BusSchedule schedule)
            SeedSchedule(AppDbContext db,
                BusStatus busStatus = BusStatus.Available,
                DateTime? departure = null,
                decimal price = 500m,
                bool scheduleCancelled = false)
        {
            var user = MakeUser(Roles.Operator);
            db.Users.Add(user);

            var op = MakeOperator(user.Id);
            db.BusOperators.Add(op);

            var bus = MakeBus(op.Id, busStatus);
            db.Buses.Add(bus);

            var route = MakeRoute(op.Id);
            db.BusRoutes.Add(route);

            var schedule = MakeSchedule(bus.Id, route.Id, departure, price, scheduleCancelled);
            db.BusSchedules.Add(schedule);

            db.SaveChanges();

            // Attach nav props so tests can use them without extra queries
            schedule.Bus   = bus;
            schedule.Route = route;

            return (op, bus, route, schedule);
        }
    }
}
