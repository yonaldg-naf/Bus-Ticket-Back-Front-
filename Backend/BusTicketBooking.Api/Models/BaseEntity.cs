using System;

namespace BusTicketBooking.Models
{
    public abstract class BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAtUtc { get; set; }

        // Soft-delete (optional; we’ll wire filters later if needed)
        public bool IsDeleted { get; set; }

        // Concurrency token to protect seat booking, etc.
        public byte[]? RowVersion { get; set; }
    }
}
