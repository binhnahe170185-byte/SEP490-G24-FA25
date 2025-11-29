using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Repositories;

public class LecturerRepository : GenericRepository<Lecture>, ILecturerRepository
{
    public LecturerRepository(FjapDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId)
    {
        // Query lessons của lecturer và map sang DTO
        var lessons = await _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Room)
            .Include(l => l.Lecture)
            .Include(l => l.Time)
            .Where(l => l.LectureId == lecturerId)
            .OrderBy(l => l.Date)
            .ThenBy(l => l.Time.StartTime)
            .Select(l => new LessonDto
            {
                LessonId = l.LessonId,
                ClassId = l.ClassId,
                ClassName = l.Class.ClassName,
                Date = l.Date,
                RoomName = l.Room.RoomName,
                TimeId = l.TimeId,
                LectureId = l.LectureId,
                LectureCode = l.Lecture.LecturerCode ?? "",
                Attendance = null, // Không có attendance cho lecturer
                StartTime = l.Time.StartTime,
                EndTime = l.Time.EndTime,
                SubjectCode = l.Class.Subject.SubjectCode
            })
            .ToListAsync();

        return lessons;
    }

    public async Task<IEnumerable<LecturerDto>> GetAllLecturersAsync()
    {
        var lecturers = await _context.Lectures
            .AsNoTracking()
            .Include(l => l.User)
            .Where(l => l.User != null && l.User.Status != null && l.User.Status.ToLower() == "active")
            .Select(l => new LecturerDto
            {
                LecturerId = l.LectureId,
                LecturerCode = l.LecturerCode,
                Email = l.User != null ? l.User.Email : null
            })
            .OrderBy(l => l.LecturerCode)
            .ToListAsync();

        return lecturers;
    }

    public async Task<IEnumerable<LecturerClassDto>> GetClassesByLecturerIdAsync(int lecturerId, int? semesterId = null)
    {
        // Query lessons của lecturer để lấy classes
        var lessonsQuery = _context.Lessons
            .AsNoTracking()
            .Include(l => l.Class)
                .ThenInclude(c => c.Subject)
            .Include(l => l.Class)
                .ThenInclude(c => c.Semester)
            .Where(l => l.LectureId == lecturerId);

        // Filter by semester nếu có
        if (semesterId.HasValue)
        {
            lessonsQuery = lessonsQuery.Where(l => l.Class.SemesterId == semesterId.Value);
        }

        var lessons = await lessonsQuery
            .ToListAsync();

        // Group by ClassId để lấy distinct classes
        var classGroups = lessons
            .GroupBy(l => l.ClassId)
            .Select(g => g.First().Class)
            .ToList();

        // Map to DTO
        var result = classGroups.Select(c => new LecturerClassDto
        {
            ClassId = c.ClassId,
            ClassName = c.ClassName,
            ClassCode = c.ClassName, // Có thể thêm ClassCode nếu có
            SemesterId = c.SemesterId,
            SemesterName = c.Semester?.Name,
            StartDate = c.Semester?.StartDate.ToDateTime(TimeOnly.MinValue),
            EndDate = c.Semester?.EndDate.ToDateTime(TimeOnly.MinValue),
            Subjects = lessons
                .Where(l => l.ClassId == c.ClassId)
                .Select(l => new LecturerClassSubjectDto
                {
                    SubjectId = l.Class.Subject.SubjectId,
                    SubjectCode = l.Class.Subject.SubjectCode,
                    SubjectName = l.Class.Subject.SubjectName
                })
                .DistinctBy(s => s.SubjectId)
                .ToList()
        })
        .OrderBy(c => c.ClassName)
        .ToList();

        return result;
    }

    public async Task<LecturerDetailDto?> GetLecturerByIdAsync(int lecturerId)
    {
        var lecturer = await _context.Lectures
            .AsNoTracking()
            .Include(l => l.User)
                .ThenInclude(u => u.Department)
            .Where(l => l.LectureId == lecturerId)
            .Select(l => new LecturerDetailDto
            {
                LecturerId = l.LectureId,
                LecturerCode = l.LecturerCode,
                FirstName = l.User.FirstName,
                LastName = l.User.LastName,
                Email = l.User.Email,
                Avatar = l.User.Avatar,
                PhoneNumber = l.User.PhoneNumber,
                Address = l.User.Address,
                Gender = l.User.Gender,
                Dob = l.User.Dob,
                DepartmentName = l.User.Department != null ? l.User.Department.DepartmentName : null
            })
            .FirstOrDefaultAsync();

        return lecturer;
    }
}

