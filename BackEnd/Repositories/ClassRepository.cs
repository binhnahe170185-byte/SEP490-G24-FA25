using System;
using System.Collections.Generic;
using System.Linq;
using FJAP.Models;
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

    public async Task<IEnumerable<ClassSubjectDetail>> GetSubjectsAsync(string classId)
    {
        return await _context.Classes
            .Where(c => c.ClassId.ToString() == classId)
            .SelectMany(c => c.Subjects.Select(s => new ClassSubjectDetail
            {
                class_id = c.ClassId.ToString(),
                class_name = c.ClassName,
                subject_name = s.SubjectName,
                subject_level = s.LevelId,
                total_students = c.Students.Count
            }))
            .ToListAsync();
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
}
