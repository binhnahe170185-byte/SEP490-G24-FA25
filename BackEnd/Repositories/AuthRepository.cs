using System.Threading.Tasks;
using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories
{
    public class AuthRepository : GenericRepository<Account>, IAuthRepository
    {
        private readonly FjapDbContext _db;

        public AuthRepository(FjapDbContext db) : base(db)
        {
            _db = db;
        }
        public Task<Account?> GetByEmailAsync(string email)
        {
            return _db.Accounts
                .Include(a => a.User)
                .SingleOrDefaultAsync(a => a.Email == email);
        }

      
        public async Task<GoogleJsonWebSignature.Payload?> VerifyGoogleTokenAsync(string idToken, string clientId)
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            };

            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
                return payload; // hợp lệ → trả payload
            }
            catch
            {
                return null;    // token không hợp lệ
            }
        }

  
    }
}
