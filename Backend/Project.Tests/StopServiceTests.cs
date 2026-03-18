using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;
using System.Linq;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using BusTicketBooking.Dtos.Stops;

public class StopServiceTests
{
    private AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    private StopService CreateSUT(AppDbContext db) => new StopService(db);

    // -------------------------------------------------------
    // GET CITIES
    // -------------------------------------------------------

    [Fact]
    public async Task GetCitiesAsync_ReturnsOrderedCities()
    {
        var db = NewDb();

        db.Stops.Add(new Stop { City = "Mumbai", Name = "A" });
        db.Stops.Add(new Stop { City = "Pune", Name = "B" });
        db.Stops.Add(new Stop { City = "Mumbai", Name = "C" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetCitiesAsync();

        Assert.Equal(2, result.Count());
        Assert.Contains(result, x => x.City == "Mumbai" && x.StopCount == 2);
    }

    [Fact]
    public async Task GetCitiesAsync_EmptyDb_ReturnsEmpty()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.GetCitiesAsync();

        Assert.Empty(result);
    }

    // -------------------------------------------------------
    // GET STOPS BY CITY
    // -------------------------------------------------------

    [Fact]
    public async Task GetStopsByCityAsync_ReturnsStopsSortedByName()
    {
        var db = NewDb();

        db.Stops.Add(new Stop { City = "Delhi", Name = "Z" });
        db.Stops.Add(new Stop { City = "Delhi", Name = "A" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetStopsByCityAsync("Delhi");

        Assert.Equal(2, result.Count());
        Assert.Equal("A", result.First().Name);
    }

    [Fact]
    public async Task GetStopsByCityAsync_EmptyCity_ReturnsEmpty()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.GetStopsByCityAsync("");

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetStopsByCityAsync_NoMatches_ReturnsEmpty()
    {
        var db = NewDb();
        db.Stops.Add(new Stop { City = "Pune", Name = "Katraj" });
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.GetStopsByCityAsync("Mumbai");

        Assert.Empty(result);
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    [Fact]
    public async Task CreateAsync_Success()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateStopRequestDto
        {
            City = "Mumbai",
            Name = "Dadar",
            Latitude = 1,
            Longitude = 2
        };

        var result = await sut.CreateAsync(dto);

        Assert.Equal("Mumbai", result.City);
        Assert.Single(db.Stops.ToList());
    }

    [Fact]
    public async Task CreateAsync_TrimsCityAndName()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new CreateStopRequestDto
        {
            City = "  Pune ",
            Name = "  Nagar Road  ",
            Latitude = null,
            Longitude = null
        };

        var result = await sut.CreateAsync(dto);

        Assert.Equal("Pune", result.City);
        Assert.Equal("Nagar Road", result.Name);
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    [Fact]
    public async Task UpdateAsync_Success()
    {
        var db = NewDb();

        var stop = new Stop { City = "Mumbai", Name = "Bandra" };
        db.Stops.Add(stop);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var dto = new UpdateStopRequestDto
        {
            City = "Pune",
            Name = "Shivaji Nagar",
            Latitude = 10,
            Longitude = 20
        };

        var updated = await sut.UpdateAsync(stop.Id, dto);

        Assert.NotNull(updated);
        Assert.Equal("Pune", updated.City);
        Assert.Equal("Shivaji Nagar", updated.Name);
    }

    [Fact]
    public async Task UpdateAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var dto = new UpdateStopRequestDto
        {
            City = "X",
            Name = "Y",
            Latitude = null,
            Longitude = null
        };

        var result = await sut.UpdateAsync(Guid.NewGuid(), dto);

        Assert.Null(result);
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    [Fact]
    public async Task DeleteAsync_Success()
    {
        var db = NewDb();
        var stop = new Stop { City = "Mumbai", Name = "Dadar" };
        db.Stops.Add(stop);
        db.SaveChanges();

        var sut = CreateSUT(db);

        var result = await sut.DeleteAsync(stop.Id);

        Assert.True(result);
        Assert.Empty(db.Stops.ToList());
    }

    [Fact]
    public async Task DeleteAsync_NotFound_ReturnsFalse()
    {
        var db = NewDb();
        var sut = CreateSUT(db);

        var result = await sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
    }
}