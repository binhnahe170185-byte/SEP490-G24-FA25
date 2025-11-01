using Microsoft.EntityFrameworkCore;

namespace FJAP.vn.fpt.edu.models;

public partial class FjapDbContext : DbContext
{
    // DbSet cho LessonDto - DTO không phải entity trong database
    public virtual DbSet<LessonDto> LessonDtos { get; set; } = null!;

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        // Cấu hình LessonDto như một entity không có bảng trong database
        modelBuilder.Entity<LessonDto>()
            .HasNoKey()  // LessonDto không có Primary Key vì đây chỉ là DTO
            .ToView(null); // Không map với bảng nào cả
    }
}

