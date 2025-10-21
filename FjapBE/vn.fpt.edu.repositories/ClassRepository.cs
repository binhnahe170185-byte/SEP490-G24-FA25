using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class ClassRepository : GenericRepository<Class>, IClassRepository
{
    public ClassRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<Class?> GetWithStudentsAsync(int id)
    {
        return await _context.Classes
            .Include(c => c.Students)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClassId == id);
    }

    public async Task<IEnumerable<Class>> GetAllAsync()
    {
        return await _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .Include(c => c.Subject)
                .ThenInclude(s => s.Level)
            .Include(c => c.Students)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Class?> GetSubjectsAsync(string classId)
    {
        if (string.IsNullOrWhiteSpace(classId))
        {
            return null;
        }

        var normalizedId = classId.Trim();

        IQueryable<Class> BuildQuery() => _context.Classes
            .Include(c => c.Subject)
                .ThenInclude(s => s.Level)
            .Include(c => c.Students)
            .Include(c => c.Lessons)
                .ThenInclude(l => l.Lecture)
                    .ThenInclude(le => le.User)
            .AsNoTracking();

        Class? cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassId.ToString() == normalizedId);

        if (cls == null)
        {
            cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassName == normalizedId);
        }

        if (cls == null)
        {
            var numericPart = new string(normalizedId.Where(char.IsDigit).ToArray());
            if (int.TryParse(numericPart, out var numericId))
            {
                cls = await BuildQuery().FirstOrDefaultAsync(c => c.ClassId == numericId);
            }
        }

        return cls;
    }

    public async Task<Class> UpdateStatusAsync(string classId, bool status)
    {
        var cls = await _context.Classes
            .Include(c => c.Semester)
            .Include(c => c.Level)
            .FirstOrDefaultAsync(c => c.ClassId.ToString() == classId);

        if (cls == null)
        {
            throw new KeyNotFoundException("Class not found");
        }

        cls.Status = status ? "Active" : "Inactive";
        cls.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return cls;
    }

    public async Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId)
    {
        var subjectId = await _context.Classes
            .Where(c => c.ClassId == classId)
            .Select(c => c.SubjectId)
            .FirstOrDefaultAsync();

        var enrollmentTotals = await _context.Database
            .SqlQueryRaw<EnrollmentCount>(
                "SELECT class_id, COUNT(student_id) AS total_students FROM enrollment WHERE class_id = {0} GROUP BY class_id",
                classId)
            .ToListAsync();

        var totalStudents = enrollmentTotals.FirstOrDefault()?.total_students ?? 0;

        if (subjectId == 0)
        {
            return new Dictionary<int, int>();
        }

        return new Dictionary<int, int> { [subjectId] = totalStudents };
    }

    public async Task<(List<Level> Levels, List<Semester> Semesters, List<Subject> Subjects)> GetFormOptionsAsync()
    {
        var levels = await _context.Levels
            .AsNoTracking()
            .OrderBy(l => l.LevelName)
            .ToListAsync();

        var semesters = await _context.Semesters
            .AsNoTracking()
            .OrderByDescending(s => s.StartDate)
            .ToListAsync();

        var subjects = await _context.Subjects
            .Include(s => s.Level)
            .AsNoTracking()
            .OrderBy(s => s.SubjectName)
            .ToListAsync();

        return (levels, semesters, subjects);
    }

    private sealed record EnrollmentCount(int class_id, int total_students);
}
