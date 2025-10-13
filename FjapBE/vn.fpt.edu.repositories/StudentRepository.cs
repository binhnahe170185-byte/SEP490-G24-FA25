using FJAP.Models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace FJAP.Repositories;

public class StudentRepository : GenericRepository<Student>, IStudentRepository
{
    public StudentRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Student?> GetWithClassesAsync(int id)
    {
        return await _context.Students
            .Include(s => s.Classes)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.StudentId == id);
    }

    public async Task<IEnumerable<Student>> GetAllAsync()
    {
        return await _context.Students
            .Include(s => s.User)
            .Include(s => s.Level)
            .Include(s => s.Classes)
            .ToListAsync();
    }
    // hàm cần sửa 
    // hiện tại chạy ok 
    public async Task<IEnumerable<Lesson>> GetLessonsByStudentIdAsync(int studentId)
    {
        var lessons = await _context.Lessons
            .FromSqlInterpolated($@"
            SELECT 
                l.lesson_id,
                l.class_id,
                l.date,
                l.room_id,
                l.time_id,
                l.lecture_id,
                0 AS SubjectId  
            FROM fjap.lesson AS l
            JOIN fjap.class AS c ON c.class_id = l.class_id
            JOIN fjap.enrollment AS e ON e.class_id = c.class_id
            WHERE e.student_id = {studentId}
        ")
            .AsNoTracking()
            .ToListAsync();

        return lessons;
    }



}
