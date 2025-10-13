using System.Linq.Expressions;
using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class GenericRepository<TEntity> : IGenericRepository<TEntity> where TEntity : class
{
    protected readonly FjapDbContext _context;
    protected readonly DbSet<TEntity> _dbSet;

    public GenericRepository(FjapDbContext context)
    {
        _context = context;
        _dbSet = _context.Set<TEntity>();
    }

    public async Task<IEnumerable<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>>? predicate = null, Func<IQueryable<TEntity>, IOrderedQueryable<TEntity>>? orderBy = null, string? includeProperties = null, bool noTracking = true)
    {
        IQueryable<TEntity> query = _dbSet;
        if (predicate != null)
            query = query.Where(predicate);

        if (!string.IsNullOrWhiteSpace(includeProperties))
        {
            foreach (var includeProp in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                query = query.Include(includeProp);
            }
        }
        if (noTracking)
            query = query.AsNoTracking();
        if (orderBy != null)
            query = orderBy(query);
        return await query.ToListAsync();
    }

    public async Task<TEntity?> GetByIdAsync(object id) => await _dbSet.FindAsync(id);

    public async Task<TEntity?> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate, string? includeProperties = null, bool noTracking = true)
    {
        IQueryable<TEntity> query = _dbSet;
        query = query.Where(predicate);
        if (!string.IsNullOrWhiteSpace(includeProperties))
        {
            foreach (var includeProp in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                query = query.Include(includeProp);
            }
        }
        if (noTracking)
            query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync();
    }

    public async Task AddAsync(TEntity entity) => await _dbSet.AddAsync(entity);
    public async Task AddRangeAsync(IEnumerable<TEntity> entities) => await _dbSet.AddRangeAsync(entities);

    public void Update(TEntity entity) => _dbSet.Update(entity);

    public void Remove(TEntity entity) => _dbSet.Remove(entity);
    public void RemoveRange(IEnumerable<TEntity> entities) => _dbSet.RemoveRange(entities);

    public Task<int> SaveChangesAsync() => _context.SaveChangesAsync();
}
