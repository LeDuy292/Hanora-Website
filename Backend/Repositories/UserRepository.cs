using BusinessObjects.Models;
using DataAccessObjects;
using Microsoft.EntityFrameworkCore;

namespace Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByGoogleIdAsync(string googleId);
        Task<User?> GetByIdAsync(long id);
        Task<User> CreateAsync(User user);
        Task<User> UpdateAsync(User user);
    }

    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _db;

        public UserRepository(AppDbContext db)
        {
            _db = db;
        }

        public Task<User?> GetByEmailAsync(string email) =>
            _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        public Task<User?> GetByGoogleIdAsync(string googleId) =>
            _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

        public async Task<User?> GetByIdAsync(long id) =>
            await _db.Users.FindAsync(id);

        public async Task<User> CreateAsync(User user)
        {
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            return user;
        }

        public async Task<User> UpdateAsync(User user)
        {
            _db.Users.Update(user);
            await _db.SaveChangesAsync();
            return user;
        }
    }
}
