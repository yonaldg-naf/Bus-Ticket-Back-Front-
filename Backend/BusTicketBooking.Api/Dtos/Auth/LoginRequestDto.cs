using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Auth
{
    public class LoginRequestDto
    {
        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required, MinLength(6), MaxLength(100)]
        public string Password { get; set; } = string.Empty;
    }
}