using BusTicketBooking.Contexts;
using BusTicketBooking.Models;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Tests.Helpers
{
    public static class SeedHelper
    {
        // ── Users ─────────────────────────────────────────────────────────────

        public static User MakeUser(string role = Roles.Customer)
            => new User
            {
                Id           = Guid.NewGuid(),
                Username     = "testuser_" + Guid.NewGuid().ToString()[..6],
                Email        = Guid.NewGuid().ToString()[..6] + "@test.com",
                FullName     = "Test User",
                Role         = role,
                PasswordHash = "hash"
            };

        // ── Bus ───────────────────────────────────────────────────────────────

        public static Bus MakeBus(BusStatus status = BusStatus.Available, int seats = 40)
            => new Bus
            {
                Id                 = Guid.NewGuid(),
                Code               = "BUS-" + Guid.NewGuid().ToString()[..4].ToUpper(),
                RegistrationNumber = "MH12AB1234",
                BusType            = BusType.Seater,
                TotalSeats         = seats,
                Status             = status
            };

        // ── Route ─────────────────────────────────────────────────────────────

        public static BusRoute MakeRoute()
            => new BusRoute
            {
                Id        = Guid.NewGuid(),
                RouteCode = "RT-" + Guid.NewGuid().ToString()[..4].ToUpper()
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
                Id             = Guid.NewGuid(),
                UserId         = userId,
                ScheduleId     = scheduleId,
                Status         = status,
                TotalAmount    = amount,
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

        public static PromoCode MakePromo(
            string code = "SAVE10", int discountType = 1, decimal discountValue = 100m,
            int maxUses = 10, int usedCount = 0, decimal? minAmount = null)
            => new PromoCode
            {
                Id               = Guid.NewGuid(),
                Code             = code,
                DiscountType     = discountType,
                DiscountValue    = discountValue,
                MaxUses          = maxUses,
                UsedCount        = usedCount,
                IsActive         = true,
                ExpiresAtUtc     = DateTime.UtcNow.AddDays(30),
                MinBookingAmount = minAmount
            };

        // ── Seed a full scenario (bus + route + schedule) ─────────────────────

        public static (object placeholder, Bus bus, BusRoute route, BusSchedule schedule)
            SeedSchedule(AppDbContext db,
                BusStatus busStatus = BusStatus.Available,
                DateTime? departure = null,
                decimal price = 500m,
                bool scheduleCancelled = false)
        {
            var bus = MakeBus(busStatus);
            db.Buses.Add(bus);

            var route = MakeRoute();
            db.BusRoutes.Add(route);

            var schedule = MakeSchedule(bus.Id, route.Id, departure, price, scheduleCancelled);
            db.BusSchedules.Add(schedule);

            db.SaveChanges();

            schedule.Bus   = bus;
            schedule.Route = route;

            return (new object(), bus, route, schedule);
        }
    }
}
