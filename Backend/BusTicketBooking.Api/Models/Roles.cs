namespace BusTicketBooking.Models
{
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string Operator = "Operator";
        public const string Customer = "Customer";
        /// <summary>Registered as operator but awaiting admin approval.</summary>
        public const string PendingOperator = "PendingOperator";
    }
}