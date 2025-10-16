using System.Threading.Tasks;
using FJAP.vn.fpt.edu.models;
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

        public async Task<int?> GetStudentIdByUserIdAsync(int userId)
        {
            var student = await _db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
            return student?.StudentId;
        }

        public async Task<int?> GetLectureIdByUserIdAsync(int userId)
        {
            var lecturer = await _db.Lectures.FirstOrDefaultAsync(l => l.UserId == userId);
            return lecturer?.LectureId;
        }
    }
}
