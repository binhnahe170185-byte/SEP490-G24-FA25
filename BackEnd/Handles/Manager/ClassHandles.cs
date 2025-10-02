using Backend.Data;
using Dapper;
using FAJP.Models;

namespace FJAP.Handles.Manager
{
    // Interface để DI vào controller
    public interface IClassHandle
    {
        Task<IEnumerable<Class>> GetAllAsync();
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
                    s.subject_name     AS subject,
                    CONCAT(u.first_name, ' ', u.last_name) AS teacher,
                    r.room_name,
                    CAST(COUNT(DISTINCT e.student_id) AS UNSIGNED) AS students
                FROM class c
                JOIN subject s ON s.class_id = c.class_id
                JOIN lesson l ON l.class_id = c.class_id
                JOIN lecture lec ON lec.lecture_id = l.lecture_id
                JOIN user u ON u.user_id = lec.user_id
                JOIN room r ON r.room_id = l.room_id
                LEFT JOIN enrollment e ON e.class_id = c.class_id
                GROUP BY 
                    c.class_id,
                    c.class_name,
                    s.subject_name,
                    CONCAT(u.first_name, ' ', u.last_name),
                    r.room_name
                ORDER BY c.class_id;";

            return await _db.QueryAsync<Class>(sql);
        }
    }
}
