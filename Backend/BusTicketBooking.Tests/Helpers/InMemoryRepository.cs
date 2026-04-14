using System.Linq.Expressions;
using BusTicketBooking.Interfaces;

namespace BusTicketBooking.Tests.Helpers
{
    /// <summary>
    /// Simple in-memory IRepository implementation for unit tests.
    /// Works with any class that has a Guid Id property.
    /// </summary>
    public class InMemoryRepository<TEntity> : IRepository<TEntity> where TEntity : class
    {
        private readonly List<TEntity> _store = new();

        private static Guid GetId(TEntity entity)
        {
            var prop = typeof(TEntity).GetProperty("Id")
                ?? throw new InvalidOperationException($"{typeof(TEntity).Name} has no Id property.");
            return (Guid)prop.GetValue(entity)!;
        }

        public Task<TEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
            => Task.FromResult(_store.FirstOrDefault(e => GetId(e) == id));

        public Task<IEnumerable<TEntity>> GetAllAsync(CancellationToken ct = default)
            => Task.FromResult<IEnumerable<TEntity>>(_store.ToList());

        public Task<IEnumerable<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => Task.FromResult<IEnumerable<TEntity>>(_store.AsQueryable().Where(predicate).ToList());

        public Task<TEntity> AddAsync(TEntity entity, CancellationToken ct = default)
        {
            _store.Add(entity);
            return Task.FromResult(entity);
        }

        public Task AddRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
        {
            _store.AddRange(entities);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(TEntity entity, CancellationToken ct = default)
        {
            var id = GetId(entity);
            var idx = _store.FindIndex(e => GetId(e) == id);
            if (idx >= 0) _store[idx] = entity;
            return Task.CompletedTask;
        }

        public Task RemoveAsync(TEntity entity, CancellationToken ct = default)
        {
            _store.Remove(entity);
            return Task.CompletedTask;
        }

        public Task RemoveRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
        {
            foreach (var e in entities.ToList()) _store.Remove(e);
            return Task.CompletedTask;
        }

        public Task<bool> ExistsAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken ct = default)
            => Task.FromResult(_store.AsQueryable().Any(predicate));

        public Task<int> SaveChangesAsync(CancellationToken ct = default)
            => Task.FromResult(0);

        public IReadOnlyList<TEntity> All => _store.AsReadOnly();
    }
}
