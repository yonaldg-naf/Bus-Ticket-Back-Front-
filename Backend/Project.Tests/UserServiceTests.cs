using Xunit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Moq;
using System;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using BusTicketBooking.Interfaces;

public class UserServiceTests
{
    private AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new AppDbContext(options);
    }

    private User CreateUser(string username = "user1", string email = "u1@test.com")
        => new User
        {
            Username = username,
            Email = email,
            FullName = username,
            Role = "Customer",
        };

    // ------------------------------------------------------
    // FindByUsernameAsync
    // ------------------------------------------------------

    [Fact]
    public async Task FindByUsernameAsync_FindsUser()
    {
        var db = NewDb();
        var u = CreateUser("john");
        db.Users.Add(u);
        db.SaveChanges();

        var service = new UserService(db, Mock.Of<IPasswordService>());

        var found = await service.FindByUsernameAsync("john");

        Assert.NotNull(found);
        Assert.Equal("john", found.Username);
    }

    [Fact]
    public async Task FindByUsernameAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var service = new UserService(db, Mock.Of<IPasswordService>());

        var found = await service.FindByUsernameAsync("missing");

        Assert.Null(found);
    }

    // ------------------------------------------------------
    // FindByEmailAsync
    // ------------------------------------------------------

    [Fact]
    public async Task FindByEmailAsync_FindsUser()
    {
        var db = NewDb();

        var u = CreateUser("alex", "alex@mail.com");
        db.Users.Add(u);
        db.SaveChanges();

        var service = new UserService(db, Mock.Of<IPasswordService>());

        var found = await service.FindByEmailAsync("alex@mail.com");

        Assert.NotNull(found);
        Assert.Equal("alex@mail.com", found.Email);
    }

    [Fact]
    public async Task FindByEmailAsync_NotFound_ReturnsNull()
    {
        var db = NewDb();
        var service = new UserService(db, Mock.Of<IPasswordService>());

        var found = await service.FindByEmailAsync("none@mail.com");

        Assert.Null(found);
    }

    // ------------------------------------------------------
    // CreateAsync - Success
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_Success()
    {
        var db = NewDb();

        var mockPass = new Mock<IPasswordService>();
        mockPass.Setup(p => p.Hash(It.IsAny<User>(), "secret"))
                .Returns("HASHED");

        var service = new UserService(db, mockPass.Object);

        var user = CreateUser("neo", "neo@mail.com");

        var created = await service.CreateAsync(user, "secret");

        Assert.Equal("HASHED", created.PasswordHash);
        Assert.Single(db.Users);
    }

    // ------------------------------------------------------
    // CreateAsync - Duplicate Username
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_DuplicateUsername_Throws()
    {
        var db = NewDb();

        db.Users.Add(CreateUser("same", "a@mail.com"));
        db.SaveChanges();

        var service = new UserService(db, Mock.Of<IPasswordService>());

        var newUser = CreateUser("same", "another@mail.com");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(newUser, "pass"));
    }

    // ------------------------------------------------------
    // CreateAsync - Duplicate Email
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_DuplicateEmail_Throws()
    {
        var db = NewDb();

        db.Users.Add(CreateUser("u1", "dup@mail.com"));
        db.SaveChanges();

        var service = new UserService(db, Mock.Of<IPasswordService>());

        var newUser = CreateUser("newuser", "dup@mail.com");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateAsync(newUser, "pass"));
    }

    // ------------------------------------------------------
    // CreateAsync - PasswordService invoked
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_PasswordHashInvoked()
    {
        var db = NewDb();
        var mockPass = new Mock<IPasswordService>();

        mockPass.Setup(p => p.Hash(It.IsAny<User>(), "abc"))
                .Returns("HASHED123");

        var service = new UserService(db, mockPass.Object);

        var user = CreateUser("tom", "tom@mail.com");

        await service.CreateAsync(user, "abc");

        mockPass.Verify(p => p.Hash(user, "abc"), Times.Once);
    }

    // ------------------------------------------------------
    // CreateAsync - Password NOT plaintext
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_PasswordStoredIsNotPlaintext()
    {
        var db = NewDb();
        var mockPass = new Mock<IPasswordService>();

        mockPass.Setup(p => p.Hash(It.IsAny<User>(), It.IsAny<string>()))
                .Returns("HASHEDVALUE");

        var service = new UserService(db, mockPass.Object);

        var user = CreateUser("zed", "zed@mail.com");

        var created = await service.CreateAsync(user, "mypassword");

        Assert.Equal("HASHEDVALUE", created.PasswordHash);
        Assert.NotEqual("mypassword", created.PasswordHash);
    }

    // ------------------------------------------------------
    // CreateAsync returns same instance
    // ------------------------------------------------------

    [Fact]
    public async Task CreateAsync_ReturnsSameInstance()
    {
        var db = NewDb();

        var mockPass = new Mock<IPasswordService>();
        mockPass.Setup(p => p.Hash(It.IsAny<User>(), "p1"))
                .Returns("HASHED1");

        var service = new UserService(db, mockPass.Object);

        var user = CreateUser("alpha", "alpha@mail.com");

        var created = await service.CreateAsync(user, "p1");

        Assert.Same(user, created);
        Assert.Equal("HASHED1", created.PasswordHash);
    }
}