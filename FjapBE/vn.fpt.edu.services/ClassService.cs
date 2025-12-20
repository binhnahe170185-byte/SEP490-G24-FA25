using System.Collections.Generic;
using System.Linq;
using FJAP.vn.fpt.edu.models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services;

public class ClassService : IClassService
{
    private readonly IClassRepository _classRepository;

    public ClassService(IClassRepository classRepository)
    {
        _classRepository = classRepository;
    }

    public async Task<IEnumerable<Class>> GetAllAsync()
        => await _classRepository.GetAllAsync(
            orderBy: q => q.OrderBy(c => c.ClassId),
            includeProperties: "Semester,Level,Subject,Students");

    public Task<Class?> GetByIdAsync(int id)
        => _classRepository.FirstOrDefaultAsync(
            cls => cls.ClassId == id,
            includeProperties: "Semester,Level,Subject,Students",
            noTracking: false);

    public Task<Class?> GetWithStudentsAsync(int id) => _classRepository.GetWithStudentsAsync(id);

    public async Task<Class> CreateAsync(Class item)
    {
        // Ensure status is explicit to avoid null/default surprises on client
        if (string.IsNullOrWhiteSpace(item.Status))
        {
            item.Status = "Inactive";
        }
        // Use local time to match user expectations (similar to Homework deadline handling)
        item.UpdatedAt = DateTime.Now;
        await _classRepository.AddAsync(item);
        await _classRepository.SaveChangesAsync();
        return item;
    }

    public async Task<bool> UpdateAsync(Class item)
    {
        var existing = await _classRepository.GetByIdAsync(item.ClassId);
        if (existing == null) return false;

        existing.ClassName = item.ClassName;
        existing.SemesterId = item.SemesterId;
        existing.LevelId = item.LevelId;
        existing.SubjectId = item.SubjectId;
        existing.Status = string.IsNullOrWhiteSpace(item.Status) ? existing.Status : item.Status;
    // persist enrollment limits
    existing.MinStudents = item.MinStudents;
    existing.MaxStudents = item.MaxStudents;
        // Use local time to match user expectations
        existing.UpdatedAt = DateTime.Now;

        _classRepository.Update(existing);
        await _classRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _classRepository.GetByIdAsync(id);
        if (existing == null) return false;
        _classRepository.Remove(existing);
        await _classRepository.SaveChangesAsync();
        return true;
    }

    public Task<Class?> GetSubjectsAsync(string classId) => _classRepository.GetSubjectsAsync(classId);

    public Task<Dictionary<int, int>> GetSubjectEnrollmentCountsAsync(int classId)
        => _classRepository.GetSubjectEnrollmentCountsAsync(classId);

    public async Task<Class> UpdateStatusAsync(string classId, bool status)
    {
        var updatedClass = await _classRepository.UpdateStatusAsync(classId, status);
        return updatedClass;
    }

    public Task<(List<Level> Levels, List<Semester> Semesters, List<Subject> Subjects)> GetFormOptionsAsync()
        => _classRepository.GetFormOptionsAsync();
    public async Task<IEnumerable<ClassGradeDto>> GetClassesWithGradesAsync(ClassGradeFilterRequest? filter = null)
    {
        return await _classRepository.GetClassesWithGradesAsync(filter);
    }

    public async Task<ClassGradeDetailDto?> GetClassGradeDetailsAsync(int classId)
    {
        return await _classRepository.GetClassGradeDetailsAsync(classId);
    }

    public Task<bool> HasDuplicateNameForSubjectAsync(string className, int subjectId, int? excludeClassId = null)
        => _classRepository.ExistsWithNameAndSubjectAsync(className, subjectId, excludeClassId);

    public Task<IEnumerable<ClassScheduleDto>> GetClassScheduleBySemesterAsync(int semesterId, int classId)
        => _classRepository.GetClassScheduleBySemesterAsync(semesterId, classId);

    public Task<int> CreateScheduleFromPatternsAsync(CreateScheduleRequest request)
        => _classRepository.CreateScheduleFromPatternsAsync(request);

    public Task GetListStudentOfClassAsync(int id)
    {
        throw new NotImplementedException();
    }
}
