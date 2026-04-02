using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Dtos.Reviews;
using BusTicketBooking.Interfaces;
using BusTicketBooking.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService) => _reviewService = reviewService;

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : Guid.Empty;

        /// <summary>Submit a review for a completed booking.</summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReviewRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var result = await _reviewService.CreateAsync(UserId, dto, ct);
            return Ok(result);
        }

        /// <summary>Get all reviews for a schedule.</summary>
        [AllowAnonymous]
        [HttpGet("schedule/{scheduleId:guid}")]
        public async Task<IActionResult> GetBySchedule([FromRoute] Guid scheduleId, CancellationToken ct)
        {
            var result = await _reviewService.GetByScheduleAsync(scheduleId, ct);
            return Ok(result);
        }

        /// <summary>Get rating summary for a schedule.</summary>
        [AllowAnonymous]
        [HttpGet("schedule/{scheduleId:guid}/summary")]
        public async Task<IActionResult> GetSummary([FromRoute] Guid scheduleId, CancellationToken ct)
        {
            var result = await _reviewService.GetSummaryAsync(scheduleId, ct);
            return Ok(result);
        }

        /// <summary>Check if current user has reviewed a booking.</summary>
        [Authorize]
        [HttpGet("my/{bookingId:guid}")]
        public async Task<IActionResult> GetMyReview([FromRoute] Guid bookingId, CancellationToken ct)
        {
            var result = await _reviewService.GetMyReviewAsync(UserId, bookingId, ct);
            return result is null ? NotFound() : Ok(result);
        }
    }
}
