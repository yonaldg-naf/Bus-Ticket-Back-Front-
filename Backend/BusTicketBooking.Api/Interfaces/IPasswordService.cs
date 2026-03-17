using BusTicketBooking.Models;

namespace BusTicketBooking.Interfaces
{
    public interface IPasswordService
    {
        string Hash(User user, string password);
        bool Verify(User user, string password);
    }
}
