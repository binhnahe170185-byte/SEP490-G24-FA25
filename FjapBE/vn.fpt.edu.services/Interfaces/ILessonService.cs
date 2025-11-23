using FJAP.DTOs;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface ILessonService
{
    Task<Lesson?> GetByIdAsync(int lessonId);
    Task<bool> UpdateAsync(int lessonId, UpdateLessonRequest request);
    Task<bool> DeleteAsync(int lessonId);
}

