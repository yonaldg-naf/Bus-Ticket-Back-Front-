using System.ComponentModel.DataAnnotations;

namespace BusTicketBooking.Dtos.Common
{
    public class PagedRequestDto
    {
        private const int MaxPageSize = 100;

        [Range(1, int.MaxValue)]
        public int Page { get; set; } = 1;

        [Range(1, MaxPageSize)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Allowed: "departure", "price", "busCode", "routeCode"
        /// </summary>
        [MaxLength(50)]
        public string? SortBy { get; set; } = "departure";

        /// <summary>
        /// "asc" or "desc" (case-insensitive)
        /// </summary>
        [MaxLength(4)]
        public string? SortDir { get; set; } = "asc";

        public (int skip, int take) GetSkipTake()
        {
            var page = Page <= 0 ? 1 : Page;
            var size = PageSize <= 0 ? 10 : PageSize;
            return ((page - 1) * size, size);
        }

        public bool IsDescending() =>
            string.Equals(SortDir, "desc", StringComparison.OrdinalIgnoreCase);
    }
}