<<<<<<< HEAD
=======
using System.Collections.Generic;
using System.Threading.Tasks;
>>>>>>> 179db62 (View list material, create api for subject)
using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services
{
    public class SubjectService : ISubjectService
    {
<<<<<<< HEAD
        private readonly ISubjectRepository _subjectRepository;

        public SubjectService(ISubjectRepository subjectRepository)
        {
            _subjectRepository = subjectRepository;
        }

        public async Task<IEnumerable<SubjectDto>> GetAllAsync()
            => await _subjectRepository.GetAllWithDetailsAsync();

        public Task<SubjectDto?> GetByIdAsync(int id) 
            => _subjectRepository.GetByIdWithDetailsAsync(id);

        public async Task<Subject> CreateAsync(CreateSubjectRequest request)
        {
            var subject = new Subject
            {
                SubjectCode = request.SubjectCode,
                SubjectName = request.SubjectName,
                Description = request.Description,
                PassMark = request.PassMark,
                SemesterId = request.SemesterId,
                LevelId = request.LevelId,
                ClassId = request.ClassId,
                Status = "Active",
                CreatedAt = DateTime.Now
            };

            await _subjectRepository.AddAsync(subject);
            await _subjectRepository.SaveChangesAsync();
            return subject;
        }

        public async Task<bool> UpdateAsync(int id, UpdateSubjectRequest request)
        {
            var existing = await _subjectRepository.GetByIdAsync(id);
            if (existing == null) return false;

            existing.SubjectCode = request.SubjectCode;
            existing.SubjectName = request.SubjectName;
            existing.Description = request.Description;
            existing.PassMark = request.PassMark;
            existing.SemesterId = request.SemesterId;
            existing.LevelId = request.LevelId;
            existing.ClassId = request.ClassId;

            _subjectRepository.Update(existing);
            await _subjectRepository.SaveChangesAsync();
=======
        private readonly ISubjectRepository _repo;

        public SubjectService(ISubjectRepository repo)
        {
            _repo = repo;
        }

        public async Task<IEnumerable<Subject>> GetAllAsync()
        {
            return await _repo.GetAllAsync();
        }

        public async Task<Subject?> GetByIdAsync(int id)
        {
            return await _repo.GetByIdAsync(id);
        }

        public async Task<Subject?> GetDetailAsync(int id)
        {
            return await _repo.GetDetailAsync(id);
        }

        public async Task<Subject> CreateAsync(Subject model)
        {
            // Gán mặc định nếu cần
            // model.CreateAt = DateTime.UtcNow;

            await _repo.AddAsync(model);
            await _repo.SaveChangesAsync();
            return model;
        }

        public async Task<bool> UpdateAsync(int id, Subject model)
        {
            var entity = await _repo.GetByIdAsync(id);
            if (entity is null) return false;

            // Cập nhật các field cho phép
            entity.SubjectCode = model.SubjectCode;
            entity.SubjectName = model.SubjectName;
            entity.Status = model.Status;
            entity.Description = model.Description;
            entity.PassMark = model.PassMark;
            entity.SemesterId = model.SemesterId;
            entity.LevelId = model.LevelId;
            entity.ClassId = model.ClassId;

            _repo.Update(entity);
            await _repo.SaveChangesAsync();
>>>>>>> 179db62 (View list material, create api for subject)
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
<<<<<<< HEAD
            var existing = await _subjectRepository.GetByIdAsync(id);
            if (existing == null) return false;

            _subjectRepository.Remove(existing);
            await _subjectRepository.SaveChangesAsync();
            return true;
        }

        public async Task UpdateStatusAsync(int id, bool status)
        {
            var statusString = status ? "Active" : "Inactive";
            await _subjectRepository.UpdateStatusAsync(id, statusString);
        }
        public Task<SubjectFormOptions> GetFormOptionsAsync() 
            => _subjectRepository.GetFormOptionsAsync();
=======
            var entity = await _repo.GetByIdAsync(id);
            if (entity is null) return false;

            _repo.Remove(entity);
            await _repo.SaveChangesAsync();
            return true;
        }
>>>>>>> 179db62 (View list material, create api for subject)
    }
}