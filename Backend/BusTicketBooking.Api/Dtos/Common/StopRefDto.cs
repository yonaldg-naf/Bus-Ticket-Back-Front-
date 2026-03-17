using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Common
{
    /// <summary>
    /// Human-friendly reference to a Stop. We match by City + Name.
    /// </summary>
    public class StopRefDto
    {
        [Required, MaxLength(100)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(150)]
        public string Name { get; set; } = string.Empty;
    }
}