namespace BusTicketBooking.Interfaces
{
    public interface IUserService
    {
        Task<BusTicketBooking.Models.User?> FindByUsernameAsync(string username);
        Task<BusTicketBooking.Models.User?> FindByEmailAsync(string email);
        Task<BusTicketBooking.Models.User> CreateAsync(BusTicketBooking.Models.User user, string plainPassword);
    }
}