using BusTicketBooking.Models;

namespace BusTicketBooking.Interfaces
{
    public interface ITokenService
    {
        (string token, DateTime expiresAtUtc) GenerateAccessToken(User user);
    }
}
