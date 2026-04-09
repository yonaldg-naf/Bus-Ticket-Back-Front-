namespace BusTicketBooking.Interfaces
{
    public interface IUserService
    {
        Task<BusTicketBooking.Models.User?> FindByUsernameAsync(string username);
        Task<BusTicketBooking.Models.User?> FindByEmailAsync(string email);
        Task<BusTicketBooking.Models.User> CreateAsync(BusTicketBooking.Models.User user, string plainPassword);
        Task<object> GetUsersPagedAsync(string? role, string? search, int page, int pageSize, System.Threading.CancellationToken ct = default);
        Task<bool> ResetPasswordAsync(string email, string newPassword, System.Threading.CancellationToken ct = default);
    }
}
