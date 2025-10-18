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
            .Include(c => c.Subjects)
            .Include(c => c.Students)
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
            .Include(c => c.Subjects)
                .ThenInclude(s => s.Level)
            .Include(c => c.Subjects)
                .ThenInclude(s => s.Grades)
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
        var subjectIds = await _context.Subjects
            .Where(s => s.ClassId == classId)
            .Select(s => s.SubjectId)
            .ToListAsync();

        if (subjectIds.Count == 0)
        {
            return new Dictionary<int, int>();
        }

        var enrollmentTotals = await _context.Database
            .SqlQueryRaw<EnrollmentCount>(
                "SELECT class_id, COUNT(student_id) AS total_students FROM enrollment WHERE class_id = {0} GROUP BY class_id",
                classId)
            .ToListAsync();

        var totalStudents = enrollmentTotals.FirstOrDefault()?.total_students ?? 0;

        return subjectIds.ToDictionary(id => id, _ => totalStudents);
    }

    private sealed record EnrollmentCount(int class_id, int total_students);
}

