using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Seed
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext db, IPasswordService passwords, IConfiguration config, ILogger logger)
        {
            // Ensure database exists/migrated
            await db.Database.MigrateAsync();

            // 1) Admin user
            string adminUser = config["Seed:Admin:Username"] ?? "admin";
            string adminEmail = config["Seed:Admin:Email"] ?? "admin@btb.local";
            string adminPass = config["Seed:Admin:Password"] ?? "Admin@123";
            if (!await db.Users.AnyAsync(u => u.Username == adminUser))
            {
                var user = new User
                {
                    Username = adminUser,
                    Email = adminEmail,
                    FullName = "System Administrator",
                    Role = Roles.Admin
                };
                user.PasswordHash = passwords.Hash(user, adminPass);
                db.Users.Add(user);
                logger.LogInformation("Seeded Admin user: {Username}", adminUser);
            }

            // 2) Operator user + Operator profile (optional)
            string opUser = config["Seed:Operator:Username"] ?? "operator";
            string opEmail = config["Seed:Operator:Email"] ?? "operator@btb.local";
            string opPass = config["Seed:Operator:Password"] ?? "Operator@123";
            bool createOperator = bool.TryParse(config["Seed:Operator:Enabled"], out var opEnabled) ? opEnabled : true;
            if (createOperator && !await db.Users.AnyAsync(u => u.Username == opUser))
            {
                var op = new User
                {
                    Username = opUser,
                    Email = opEmail,
                    FullName = "Default Operator",
                    Role = Roles.Operator
                };
                op.PasswordHash = passwords.Hash(op, opPass);
                db.Users.Add(op);
                await db.SaveChangesAsync(); // ensure Id

                db.BusOperators.Add(new BusOperator
                {
                    UserId = op.Id,
                    CompanyName = "Sample Bus Operator",
                    SupportPhone = "+91-00000-00000"
                });
                logger.LogInformation("Seeded Operator user/profile: {Username}", opUser);
            }

            // 3) Seed default Stops if empty (10 Indian cities)
            if (!await db.Stops.AnyAsync())
            {
                var seedStops = new[]
                {
                    new Stop { City = "Mumbai",    Name = "Borivali East",       Latitude = 19.228, Longitude = 72.854 },
                    new Stop { City = "Pune",      Name = "Wakad Bridge",        Latitude = 18.597, Longitude = 73.763 },
                    new Stop { City = "Delhi",     Name = "Kashmiri Gate ISBT",  Latitude = 28.667, Longitude = 77.228 },
                    new Stop { City = "Bengaluru", Name = "Majestic BMTC",       Latitude = 12.978, Longitude = 77.572 },
                    new Stop { City = "Chennai",   Name = "Koyambedu CMBT",      Latitude = 13.067, Longitude = 80.196 },
                    new Stop { City = "Hyderabad", Name = "MGBS",                Latitude = 17.384, Longitude = 78.480 },
                    new Stop { City = "Ahmedabad", Name = "Paldi Bus Stop",      Latitude = 23.012, Longitude = 72.559 },
                    new Stop { City = "Jaipur",    Name = "Sindhi Camp",         Latitude = 26.918, Longitude = 75.792 },
                    new Stop { City = "Kolkata",   Name = "Esplanade Bus Term",  Latitude = 22.568, Longitude = 88.352 },
                    new Stop { City = "Surat",     Name = "Adajan Patiya",       Latitude = 21.202, Longitude = 72.793 },
                };

                await db.Stops.AddRangeAsync(seedStops);
                logger.LogInformation("Seeded default Indian city stops (10 cities).");
            }

            await db.SaveChangesAsync();
        }
    }
}
