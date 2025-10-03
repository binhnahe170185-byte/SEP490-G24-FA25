using Backend.Data;
using Dapper;
using FAJP.Models;

namespace FJAP.Handles.Manager
{
    // Interface để DI vào controller
    public interface IClassHandle
    {
        Task<IEnumerable<Class>> GetAllAsync();
        Task UpdateStatusAsync(string classId, bool status);
        // sau này có thể thêm: GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync...
    }

    // Triển khai Handle: chứa SQL, gọi Db helper chung
    public class ClassHandle : IClassHandle
    {
        private readonly MySqlDb _db;

        public ClassHandle(MySqlDb db) => _db = db;

        public async Task<IEnumerable<Class>> GetAllAsync()
        {
            const string sql = @"
                SELECT
                    c.class_id,
                    c.class_name,
                    s.name        AS semester,
                    s.start_date,
                    s.end_date,
                    c.Status AS status
                FROM class c
                JOIN semester s ON c.semester_id = s.semester_id
                ORDER BY s.start_date DESC, c.class_name;;";

            return await _db.QueryAsync<Class>(sql);
        }

        public async Task UpdateStatusAsync(string classId, bool status)
        {
            const string sql = @"
                UPDATE class
                SET Status = @Status
                WHERE class_id = @ClassId";

            await _db.ExecuteAsync(sql, new
            {
                Status = status ? "Active" : "Inactive",
                ClassId = classId
            });
        }
    }
}
