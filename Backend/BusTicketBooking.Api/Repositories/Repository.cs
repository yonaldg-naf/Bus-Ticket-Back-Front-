using BusTicketBooking.Contexts;
using BusTicketBooking.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace BusTicketBooking.Repositories
{
    public class Repository<TEntity> : IRepository<TEntity> where TEntity : class
    {
        protected readonly AppDbContext _db;
        protected readonly DbSet<TEntity> _set;

        public Repository(AppDbContext db)
        {
            _db = db;
            _set = _db.Set<TEntity>();
        }

        public virtual async Task<TEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => await _set.FindAsync(new object?[] { id }, ct);

        public virtual async Task<IEnumerable<TEntity>> GetAllAsync(CancellationToken ct = default)
            => await _set.AsNoTracking().ToListAsync(ct);

        public virtual async Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => await _set.AsNoTracking().Where(predicate).ToListAsync(ct);

        public virtual async Task<TEntity> AddAsync(TEntity entity, CancellationToken ct = default)
        {
            _set.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity;
        }

        public virtual async Task AddRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
        {
            _set.AddRange(entities);
            await _db.SaveChangesAsync(ct);
        }

        public virtual async Task UpdateAsync(TEntity entity, CancellationToken ct = default)
        {
            _set.Update(entity);
            await _db.SaveChangesAsync(ct);
        }

        public virtual async Task RemoveAsync(TEntity entity, CancellationToken ct = default)
        {
            _set.Remove(entity);
            await _db.SaveChangesAsync(ct);
        }

        public virtual async Task RemoveRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
        {
            _set.RemoveRange(entities);
            await _db.SaveChangesAsync(ct);
        }

        public virtual async Task<bool> ExistsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => await _set.AnyAsync(predicate, ct);

        public virtual async Task<int> SaveChangesAsync(CancellationToken ct = default)
            => await _db.SaveChangesAsync(ct);
    }
}