using FJAP.DTOs;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using FJAP.vn.fpt.edu.models;

namespace FJAP.Services;

public class LessonService : ILessonService
{
    private readonly ILessonRepository _lessonRepository;
    private readonly IScheduleAvailabilityService _availabilityService;

    public LessonService(ILessonRepository lessonRepository, IScheduleAvailabilityService availabilityService)
    {
        _lessonRepository = lessonRepository;
        _availabilityService = availabilityService;
    }

    public async Task<Lesson?> GetByIdAsync(int lessonId)
    {
        return await _lessonRepository.GetByIdWithRelationsAsync(lessonId);
    }

    public async Task<bool> UpdateAsync(int lessonId, UpdateLessonRequest request)
    {
        var lesson = await _lessonRepository.GetByIdWithRelationsAsync(lessonId);
        if (lesson == null)
        {
            throw new ArgumentException("Lesson not found");
        }

        var date = DateOnly.FromDateTime(DateTime.Parse(request.Date));

        // Check for conflicts before updating
        var conflictingLesson = await _lessonRepository.FindConflictingLessonAsync(
            lessonId,
            date,
            request.TimeId,
            request.RoomId,
            lesson.ClassId,
            lesson.LectureId
        );

        if (conflictingLesson != null)
        {
            if (conflictingLesson.RoomId == request.RoomId)
            {
                throw new ArgumentException($"Room conflict: Room is already occupied at {request.Date}, timeId {request.TimeId}");
            }
            if (conflictingLesson.ClassId == lesson.ClassId)
            {
                throw new ArgumentException($"Class conflict: Class already has a lesson at {request.Date}, timeId {request.TimeId}");
            }
            if (conflictingLesson.LectureId == lesson.LectureId)
            {
                throw new ArgumentException($"Lecturer conflict: Lecturer is already teaching at {request.Date}, timeId {request.TimeId}");
            }
        }

        // Update lesson
        lesson.Date = date;
        lesson.TimeId = request.TimeId;
        lesson.RoomId = request.RoomId;

        _lessonRepository.Update(lesson);
        await _lessonRepository.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int lessonId)
    {
        var lesson = await _lessonRepository.GetByIdWithAttendancesAndHomeworksAsync(lessonId);
        if (lesson == null)
        {
            throw new ArgumentException("Lesson not found");
        }

        // Check if lesson has attendances or homeworks
        if (lesson.Attendances != null && lesson.Attendances.Any())
        {
            throw new InvalidOperationException("Cannot delete lesson with existing attendances. Please delete attendances first.");
        }

        if (lesson.Homeworks != null && lesson.Homeworks.Any())
        {
            throw new InvalidOperationException("Cannot delete lesson with existing homeworks. Please delete homeworks first.");
        }

        _lessonRepository.Remove(lesson);
        await _lessonRepository.SaveChangesAsync();

        return true;
    }
}

