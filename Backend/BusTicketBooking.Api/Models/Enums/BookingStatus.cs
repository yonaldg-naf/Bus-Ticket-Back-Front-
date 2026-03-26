namespace BusTicketBooking.Models.Enums
{
    public enum BookingStatus
    {
        Pending = 1,
        Confirmed = 2,
        Cancelled = 3,          // Cancelled by customer
        Refunded = 4,

        // NEW — Used when operator cancels the schedule
        OperatorCancelled = 5,

        // Customer missed the bus — partial refund issued
        BusMissed = 6
    }
}