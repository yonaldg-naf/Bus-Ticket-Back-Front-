using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Auth
{
    public class RegisterRequestDto
    {
        [Required, MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(6), MaxLength(100)]
        public string Password { get; set; } = string.Empty;

        // Default role is Customer; allow override if you want (Admin/Operator controlled later)
        [MaxLength(30)]
        public string Role { get; set; } = "Customer";

        [MaxLength(200)]
        public string FullName { get; set; } = string.Empty;
    }
}