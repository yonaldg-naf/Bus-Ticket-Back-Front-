using System;

namespace BusTicketBooking.Dtos.Auth
{
    public class AuthResponseDto
    {
        public string AccessToken { get; set; } = string.Empty;
        //public DateTime ExpiresAtUtc { get; set; }

        //public string UserId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        //    public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        //    public string FullName { get; set; } = string.Empty;
        //}
    }
}