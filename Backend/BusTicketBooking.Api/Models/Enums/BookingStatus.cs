namespace BusTicketBooking.Models.Enums
{
    public enum BookingStatus
    {
        Pending = 1,
        Confirmed = 2,
        Cancelled = 3,          // Cancelled by customer or admin
    }
}