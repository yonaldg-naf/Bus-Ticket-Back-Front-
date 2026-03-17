using System.ComponentModel.DataAnnotations;
using BusTicketBooking.Models.Enums;

namespace BusTicketBooking.Dtos.Bus
{
    public class UpdateBusStatusRequestDto
    {
        [Required]
        public BusStatus Status { get; set; }
    }
}