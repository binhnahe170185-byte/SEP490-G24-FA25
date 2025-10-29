using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;
using static FJAP.Repositories.StudentRepository;

namespace FJAP.Services;

public class LecturerService : ILecturerService
{
    private readonly ILecturerRepository _lecturerRepository;

    public LecturerService(ILecturerRepository lecturerRepository)
    {
        _lecturerRepository = lecturerRepository;
    }

    public async Task<IEnumerable<LessonDto>> GetLessonsByLecturerIdAsync(int lecturerId)
        => await _lecturerRepository.GetLessonsByLecturerIdAsync(lecturerId);
}

