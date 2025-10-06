using Backend.Data;
using Dapper;
using FAJP.Models;

namespace FJAP.Handles.student
{
    // Interface để DI vào controller
    public interface IStudentsHandle
    {
        Task<IEnumerable<Student>> GetAllAsync();
        // sau này có thể thêm: GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync...
    }

    // Triển khai Handle: chứa SQL, gọi Db helper chung
    public class StudentsHandle : IStudentsHandle
    {
        private readonly MySqlDb _db;

        public StudentsHandle(MySqlDb db) => _db = db;

        public async Task<IEnumerable<Student>> GetAllAsync()
        {
            const string sql = @"SELECT *
                                 FROM user  ";
            // dùng hàm helper chung 
            return await _db.QueryAsync<Student>(sql);
        }
    }
}
