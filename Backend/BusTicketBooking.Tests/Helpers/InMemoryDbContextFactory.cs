using BusTicketBooking.Contexts;
using Microsoft.EntityFrameworkCore;
using System;

namespace BusTicketBooking.Tests.Helpers
{
    public static class InMemoryDbContextFactory
    {
        public static AppDbContext Create()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())   // fresh DB per test run
                .Options;

            return new AppDbContext(options);
        }
    }
}