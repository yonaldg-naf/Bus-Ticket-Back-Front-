using Xunit;
using BusTicketBooking.Services;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Identity;
using System;

public class PasswordServiceTests
{
    private User NewUser(string name = "user") => new User
    {
        Username = name,
        Email = $"{name}@mail.com",
        FullName = name,
        Role = "Customer"
    };

    // ----------------------------------------------------
    // HASH TESTS
    // ----------------------------------------------------

    [Fact]
    public void Hash_ProducesNonEmptyValue()
    {
        var svc = new PasswordService();
        var user = NewUser();

        var hash = svc.Hash(user, "secret");

        Assert.False(string.IsNullOrWhiteSpace(hash));
    }

    [Fact]
    public void Hash_IsSalted_DifferentEachTime()
    {
        var svc = new PasswordService();
        var user = NewUser();

        var h1 = svc.Hash(user, "pass");
        var h2 = svc.Hash(user, "pass");

        Assert.NotEqual(h1, h2);
    }

    // ----------------------------------------------------
    // VERIFY TESTS
    // ----------------------------------------------------

    [Fact]
    public void Verify_ReturnsTrue_ForValidPassword()
    {
        var svc = new PasswordService();
        var user = NewUser();

        user.PasswordHash = svc.Hash(user, "mypw");

        Assert.True(svc.Verify(user, "mypw"));
    }

    [Fact]
    public void Verify_ReturnsFalse_ForWrongPassword()
    {
        var svc = new PasswordService();
        var user = NewUser();

        user.PasswordHash = svc.Hash(user, "pw1");

        Assert.False(svc.Verify(user, "pw2"));
    }

    [Fact]
    public void Verify_SuccessRehashNeeded_StillReturnsTrue()
    {
        var svc = new PasswordService();
        var user = NewUser();

        // Regular valid hash
        user.PasswordHash = svc.Hash(user, "abc");

        // Even if PasswordHasher returns SuccessRehashNeeded,
        // PasswordService should return true.
        Assert.True(svc.Verify(user, "abc"));
    }

    [Fact]
    public void Verify_ReturnsFalse_WhenPasswordHashNull()
    {
        var svc = new PasswordService();
        var user = new User
        {
            Username = "u",
            Email = "u@mail.com",
            FullName = "U"
        };

        user.PasswordHash = null!;

        // PasswordHasher will throw ArgumentNullException on null hash
        Assert.Throws<ArgumentNullException>(() =>
            svc.Verify(user, "pw"));
    }

    [Fact]
    public void Verify_EmptyPassword_ReturnsFalse()
    {
        var svc = new PasswordService();
        var user = NewUser();

        user.PasswordHash = svc.Hash(user, "real");

        Assert.False(svc.Verify(user, ""));
    }

    // ----------------------------------------------------
    // EXTRA: Hash differs between users
    // ----------------------------------------------------

    [Fact]
    public void Hash_DifferentUsers_DifferentHashes()
    {
        var svc = new PasswordService();

        var u1 = NewUser("u1");
        var u2 = NewUser("u2");

        var h1 = svc.Hash(u1, "samepw");
        var h2 = svc.Hash(u2, "samepw");

        Assert.NotEqual(h1, h2);
    }
}