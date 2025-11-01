using System.Collections.Generic;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;
using Microsoft.EntityFrameworkCore;

namespace FJAP.Services;

public class StudentService : IStudentService
{
    private readonly IStudentRepository _studentRepository;

    public StudentService(IStudentRepository studentRepository)
    {
        _studentRepository = studentRepository;
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByStudentIdAsync(int id)
        => await _studentRepository.GetLessonsByStudentIdAsync(id);

    public async Task<IEnumerable<Student>> GetAllAsync()
        => await _studentRepository.GetAllAsync(orderBy: q => q.OrderBy(s => s.StudentId));

    public Task<Student?> GetByIdAsync(int id) => _studentRepository.GetByIdAsync(id);

    public Task<Student?> GetWithClassesAsync(int id) => _studentRepository.GetWithClassesAsync(id);

    public async Task<Student> CreateAsync(Student student)
    {
        await _studentRepository.AddAsync(student);
        await _studentRepository.SaveChangesAsync();
        return student;
    }

    public async Task<bool> UpdateAsync(Student student)
    {
        var existing = await _studentRepository.GetByIdAsync(student.StudentId);
        if (existing == null) return false;
        _studentRepository.Update(student);
        await _studentRepository.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _studentRepository.GetByIdAsync(id);
        if (existing == null) return false;
        _studentRepository.Remove(existing);
        await _studentRepository.SaveChangesAsync();
        return true;
    }

    public Task<List<Student>> GetEligibleForClassAsync(int classId)
        => _studentRepository.GetEligibleForClassAsync(classId);

    public Task AddStudentsToClassAsync(int classId, IEnumerable<int> studentIds)
        => _studentRepository.AddStudentsToClassAsync(classId, studentIds);

    public async Task<IEnumerable<StudentSemesterDto>> GetStudentSemestersAsync(int studentId)
        => await _studentRepository.GetStudentSemestersAsync(studentId);

    public async Task<IEnumerable<StudentCourseGradeDto>> GetStudentCoursesBySemesterAsync(int studentId, int semesterId)
        => await _studentRepository.GetStudentCoursesBySemesterAsync(studentId, semesterId);

    public async Task<StudentGradeDetailDto?> GetStudentGradeDetailsAsync(int studentId, int classId)
        => await _studentRepository.GetStudentGradeDetailsAsync(studentId, classId);

    public async Task<SemesterGPADto> GetStudentSemesterGPAAsync(int studentId, int semesterId)
        => await _studentRepository.GetStudentSemesterGPAAsync(studentId, semesterId);
}
