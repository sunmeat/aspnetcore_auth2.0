namespace Soccer.Domain.Interfaces
{
    public interface IRepository<T> where T : class
    {
        Task<IEnumerable<T>> GetAll();
        Task<T?> Get(int id);
        Task<T?> Get(string name);
        Task Create(T item);
        Task Update(T item);
        Task Delete(int id);
    }
}