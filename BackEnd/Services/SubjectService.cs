using System.Collections.Generic;
using System.Threading.Tasks;
using FJAP.Models;
using FJAP.Repositories.Interfaces;
using FJAP.Services.Interfaces;

namespace FJAP.Services
{
    public class SubjectService : ISubjectService
    {
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
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _repo.GetByIdAsync(id);
            if (entity is null) return false;

            _repo.Remove(entity);
            await _repo.SaveChangesAsync();
            return true;
        }
    }
}