using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Contexts
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<BusOperator> BusOperators => Set<BusOperator>();
        public DbSet<Bus> Buses => Set<Bus>();
        public DbSet<Stop> Stops => Set<Stop>();
        public DbSet<BusRoute> BusRoutes => Set<BusRoute>();
        public DbSet<RouteStop> RouteStops => Set<RouteStop>();
        public DbSet<BusSchedule> BusSchedules => Set<BusSchedule>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<BookingPassenger> BookingPassengers => Set<BookingPassenger>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // BaseEntity concurrency token
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                var rowVersion = entity.FindProperty(nameof(BaseEntity.RowVersion));
                if (rowVersion != null)
                {
                    rowVersion.IsConcurrencyToken = true;
                    rowVersion.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.OnAddOrUpdate;
                }
            }

            // User
            modelBuilder.Entity<User>(e =>
            {
                e.HasIndex(u => u.Username).IsUnique();
                e.HasIndex(u => u.Email).IsUnique();
                e.Property(u => u.Username).HasMaxLength(100).IsRequired();
                e.Property(u => u.Email).HasMaxLength(256).IsRequired();
                e.Property(u => u.Role).HasMaxLength(30).IsRequired();
            });

            // BusOperator
            modelBuilder.Entity<BusOperator>(e =>
            {
                e.Property(o => o.CompanyName).HasMaxLength(200).IsRequired();
                e.Property(o => o.SupportPhone).HasMaxLength(30);
                e.HasOne(o => o.User)
                 .WithOne(u => u.OperatorProfile)
                 .HasForeignKey<BusOperator>(o => o.UserId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // Bus
            modelBuilder.Entity<Bus>(e =>
            {
                e.Property(b => b.Code).HasMaxLength(50).IsRequired();
                e.Property(b => b.RegistrationNumber).HasMaxLength(50).IsRequired();
                e.HasIndex(b => new { b.OperatorId, b.Code }).IsUnique();
                e.HasOne(b => b.Operator)
                 .WithMany(o => o.Buses)
                 .HasForeignKey(b => b.OperatorId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // Stop
            modelBuilder.Entity<Stop>(e =>
            {
                e.Property(s => s.City).HasMaxLength(100).IsRequired();
                e.Property(s => s.Name).HasMaxLength(150).IsRequired();
                e.HasIndex(s => new { s.City, s.Name }).IsUnique();
            });

            // BusRoute
            modelBuilder.Entity<BusRoute>(e =>
            {
                e.Property(r => r.RouteCode).HasMaxLength(50).IsRequired();
                e.HasIndex(r => new { r.OperatorId, r.RouteCode }).IsUnique();
                e.HasOne(r => r.Operator)
                 .WithMany(o => o.Routes)
                 .HasForeignKey(r => r.OperatorId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // RouteStop
            modelBuilder.Entity<RouteStop>(e =>
            {
                e.HasIndex(rs => new { rs.RouteId, rs.Order }).IsUnique();
                e.HasOne(rs => rs.Route)
                 .WithMany(r => r.RouteStops)
                 .HasForeignKey(rs => rs.RouteId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(rs => rs.Stop)
                 .WithMany(s => s.RouteStops)
                 .HasForeignKey(rs => rs.StopId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // BusSchedule
            modelBuilder.Entity<BusSchedule>(e =>
            {
                e.HasIndex(s => new { s.BusId, s.DepartureUtc }).IsUnique();
                e.Property(s => s.BasePrice).HasPrecision(10, 2);

                e.HasOne(s => s.Bus)
                 .WithMany(b => b.Schedules)
                 .HasForeignKey(s => s.BusId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(s => s.Route)
                 .WithMany(r => r.Schedules)
                 .HasForeignKey(s => s.RouteId)
                 .OnDelete(DeleteBehavior.Restrict);
            });
            // Booking
            modelBuilder.Entity<Booking>(e =>
            {
                e.Property(b => b.TotalAmount).HasPrecision(10, 2);

                e.HasOne(b => b.User)
                 .WithMany(u => u.Bookings)
                 .HasForeignKey(b => b.UserId)
                 .OnDelete(DeleteBehavior.Restrict);

                e.HasOne(b => b.Schedule)
                 .WithMany(s => s.Bookings)
                 .HasForeignKey(b => b.ScheduleId)
                 .OnDelete(DeleteBehavior.Cascade);

                e.HasOne(b => b.Payment)
                 .WithOne(p => p.Booking)
                 .HasForeignKey<Payment>(p => p.BookingId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // BookingPassenger
            modelBuilder.Entity<BookingPassenger>(e =>
            {
                e.Property(p => p.Name).HasMaxLength(150).IsRequired();
                e.Property(p => p.SeatNo).HasMaxLength(10).IsRequired();

                e.HasOne(p => p.Booking)
                 .WithMany(b => b.Passengers)
                 .HasForeignKey(p => p.BookingId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // Payment
            modelBuilder.Entity<Payment>(e =>
            {
                e.Property(p => p.Amount).HasPrecision(10, 2);
                e.Property(p => p.ProviderReference).HasMaxLength(100);
            });

            // AuditLog
            modelBuilder.Entity<AuditLog>(e =>
            {
                e.HasKey(l => l.Id);
                e.Property(l => l.LogType).HasMaxLength(10).IsRequired();
                e.Property(l => l.Action).HasMaxLength(50).IsRequired();
                e.Property(l => l.Description).HasMaxLength(500).IsRequired();
                e.Property(l => l.Detail).HasMaxLength(4000);
                e.Property(l => l.Username).HasMaxLength(100);
                e.Property(l => l.UserRole).HasMaxLength(30);
                e.Property(l => l.EntityType).HasMaxLength(50);
                e.Property(l => l.EntityId).HasMaxLength(100);
                e.Property(l => l.HttpMethod).HasMaxLength(10);
                e.Property(l => l.Endpoint).HasMaxLength(250);
                e.HasIndex(l => l.CreatedAtUtc);
                e.HasIndex(l => l.LogType);
                e.HasIndex(l => l.UserId);
            });

            base.OnModelCreating(modelBuilder);
        }
    }
}