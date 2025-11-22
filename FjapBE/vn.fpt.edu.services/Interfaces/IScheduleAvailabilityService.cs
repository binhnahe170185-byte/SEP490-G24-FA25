using FJAP.vn.fpt.edu.models;

namespace FJAP.Services.Interfaces;

public interface IScheduleAvailabilityService
{
    Task<StudentScheduleCache> BuildStudentScheduleCacheAsync(int classId, DateOnly semesterStart, DateOnly semesterEnd);
    Task<AvailabilityCheckResponse> CheckAvailabilityAsync(AvailabilityCheckRequest request);
}