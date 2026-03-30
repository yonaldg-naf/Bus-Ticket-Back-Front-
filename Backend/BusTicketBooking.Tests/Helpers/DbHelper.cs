using BusTicketBooking.Contexts;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Tests.Helpers
{
    /// <summary>
    /// Creates a fresh in-memory database for each test so tests never share state.
    /// ConfigureWarnings suppresses the transaction warning because EF InMemory
    /// doesn't support real transactions — it silently ignores them, which is fine
    /// for unit tests since we're testing business logic, not transaction isolation.
    /// </summary>
    public static class DbHelper
    {
        public static AppDbContext CreateDb(string? name = null)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(name ?? Guid.NewGuid().ToString())
                .ConfigureWarnings(w =>
                    w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new AppDbContext(options);
        }
    }
}
