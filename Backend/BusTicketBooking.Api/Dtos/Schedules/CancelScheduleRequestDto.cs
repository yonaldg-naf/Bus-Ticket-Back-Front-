using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Schedules
{
    public class CancelScheduleRequestDto
    {
        [Required, MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }
}
