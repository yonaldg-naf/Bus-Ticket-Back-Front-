using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BusTicketBooking.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WalletController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWalletService _walletService;

        public WalletController(AppDbContext db, IWalletService walletService)
        {
            _db            = db;
            _walletService = walletService;
        }

        private Guid UserId => Guid.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"),
            out var id) ? id : Guid.Empty;

        /// <summary>Get current wallet balance and recent transactions.</summary>
        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct)
        {
            var wallet = await _walletService.GetOrCreateAsync(UserId, ct);

            var transactions = await _db.WalletTransactions
                .AsNoTracking()
                .Where(t => t.UserId == UserId)
                .OrderByDescending(t => t.CreatedAtUtc)
                .Take(50)
                .Select(t => new
                {
                    t.Id,
                    t.Type,
                    t.Amount,
                    t.BalanceAfter,
                    t.Reason,
                    t.BookingId,
                    t.Description,
                    t.CreatedAtUtc
                })
                .ToListAsync(ct);

            return Ok(new { balance = wallet.Balance, transactions });
        }

        /// <summary>Add money to wallet (mock top-up).</summary>
        [HttpPost("topup")]
        public async Task<IActionResult> TopUp([FromBody] TopUpRequestDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            await _walletService.CreditAsync(
                UserId, dto.Amount, "TopUp",
                description: $"Wallet top-up of ₹{dto.Amount}",
                ct: ct);

            var wallet = await _walletService.GetOrCreateAsync(UserId, ct);
            return Ok(new { balance = wallet.Balance, message = $"₹{dto.Amount} added to your wallet." });
        }
    }

    public class TopUpRequestDto
    {
        [Range(1, 50000, ErrorMessage = "Top-up amount must be between ₹1 and ₹50,000.")]
        public decimal Amount { get; set; }
    }
}
