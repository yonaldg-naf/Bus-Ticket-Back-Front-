using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Auth
{
    public class ForgotPasswordRequestDto
    {
        [Required, EmailAddress, MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required, MinLength(6), MaxLength(100)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
