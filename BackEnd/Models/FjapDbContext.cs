using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace FJAP.Models;

public partial class FjapDbContext : DbContext
{
    public FjapDbContext()
    {
    }

    public FjapDbContext(DbContextOptions<FjapDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Account> Accounts { get; set; }

    public virtual DbSet<Attendance> Attendances { get; set; }

    public virtual DbSet<Class> Classes { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<GradeType> GradeTypes { get; set; }

    public virtual DbSet<Homework> Homeworks { get; set; }

    public virtual DbSet<HomeworkSubmission> HomeworkSubmissions { get; set; }

    public virtual DbSet<HomeworkType> HomeworkTypes { get; set; }

    public virtual DbSet<Lecture> Lectures { get; set; }

    public virtual DbSet<Lesson> Lessons { get; set; }

    public virtual DbSet<Level> Levels { get; set; }

    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<Semester> Semesters { get; set; }

    public virtual DbSet<Student> Students { get; set; }

    public virtual DbSet<Subject> Subjects { get; set; }

    public virtual DbSet<Timeslot> Timeslots { get; set; }

    public virtual DbSet<User> Users { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.AccountId).HasName("PRIMARY");

            entity.ToTable("account");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.HasIndex(e => e.UserId, "fk_account_user_idx");

            entity.Property(e => e.AccountId).HasColumnName("account_id");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Accounts)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_account_user");
        });

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PRIMARY");

            entity.ToTable("attendance");

            entity.HasIndex(e => e.LessonId, "fk_attendance_lesson1_idx");

            entity.HasIndex(e => e.StudentId, "fk_attendance_student1_idx");

            entity.Property(e => e.AttendanceId).HasColumnName("attendance_id");
            entity.Property(e => e.LessonId).HasColumnName("lesson_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Present'")
                .HasColumnType("enum('Present','Absent','Late','Excused')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.TimeAttendance)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("time_attendance");

            entity.HasOne(d => d.Lesson).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_attendance_lesson1");

            entity.HasOne(d => d.Student).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_attendance_student1");
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.ClassId).HasName("PRIMARY");

            entity.ToTable("class");

            entity.HasIndex(e => e.LevelId, "fk_class_level1_idx");

            entity.HasIndex(e => e.SemesterId, "fk_class_semester1_idx");

            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.ClassName)
                .HasMaxLength(100)
                .HasColumnName("class_name");
            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.SemesterId).HasColumnName("semester_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Level).WithMany(p => p.Classes)
                .HasForeignKey(d => d.LevelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_class_level1");

            entity.HasOne(d => d.Semester).WithMany(p => p.Classes)
                .HasForeignKey(d => d.SemesterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_class_semester1");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.GradeId).HasName("PRIMARY");

            entity.ToTable("grade");

            entity.HasIndex(e => e.StudentId, "fk_grade_student1_idx");

            entity.HasIndex(e => e.SubjectId, "fk_grade_subject1_idx");

            entity.Property(e => e.GradeId)
                .ValueGeneratedNever()
                .HasColumnName("grade_id");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.UserId)
                .HasMaxLength(45)
                .HasColumnName("user_id");

            entity.HasOne(d => d.Student).WithMany(p => p.Grades)
                .HasForeignKey(d => d.StudentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_grade_student1");

            entity.HasOne(d => d.Subject).WithMany(p => p.Grades)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_grade_subject1");
        });

        modelBuilder.Entity<GradeType>(entity =>
        {
            entity.HasKey(e => e.GradeTypeId).HasName("PRIMARY");

            entity.ToTable("grade_type");

            entity.HasIndex(e => e.GradeId, "fk_grade_type_grade1_idx");

            entity.Property(e => e.GradeTypeId).HasColumnName("grade_type_id");
            entity.Property(e => e.Comment)
                .HasColumnType("text")
                .HasColumnName("comment");
            entity.Property(e => e.GradeId).HasColumnName("grade_id");
            entity.Property(e => e.GradeTypeName)
                .HasMaxLength(100)
                .HasColumnName("grade_type_name");
            entity.Property(e => e.Score)
                .HasPrecision(5, 2)
                .HasColumnName("score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.Weight)
                .HasPrecision(5, 2)
                .HasColumnName("weight");

            entity.HasOne(d => d.Grade).WithMany(p => p.GradeTypes)
                .HasForeignKey(d => d.GradeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_grade_type_grade1");
        });

        modelBuilder.Entity<Homework>(entity =>
        {
            entity.HasKey(e => e.HomeworkId).HasName("PRIMARY");

            entity.ToTable("homework");

            entity.HasIndex(e => e.LessonId, "lession_id_idx");

            entity.Property(e => e.HomeworkId).HasColumnName("homework_id");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Deadline)
                .HasColumnType("datetime")
                .HasColumnName("deadline");
            entity.Property(e => e.FilePath)
                .HasMaxLength(255)
                .HasColumnName("file_path");
            entity.Property(e => e.LessonId).HasColumnName("lesson_id");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");

            entity.HasOne(d => d.Lesson).WithMany(p => p.Homeworks)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("lession_id");
        });

        modelBuilder.Entity<HomeworkSubmission>(entity =>
        {
            entity.HasKey(e => e.HomeworkSubmissionId).HasName("PRIMARY");

            entity.ToTable("homework_submission");

            entity.HasIndex(e => e.HomeworkId, "fk_homework_submission_homework1_idx");

            entity.Property(e => e.HomeworkSubmissionId).HasColumnName("homework_submission_id");
            entity.Property(e => e.Comment)
                .HasColumnType("text")
                .HasColumnName("comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Feedback)
                .HasColumnType("text")
                .HasColumnName("feedback");
            entity.Property(e => e.FilePath)
                .HasMaxLength(255)
                .HasColumnName("file_path");
            entity.Property(e => e.HomeworkId).HasColumnName("homework_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Submitted'")
                .HasColumnType("enum('Submitted','Graded','Late','Rejected')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");

            entity.HasOne(d => d.Homework).WithMany(p => p.HomeworkSubmissions)
                .HasForeignKey(d => d.HomeworkId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_homework_submission_homework1");
        });

        modelBuilder.Entity<HomeworkType>(entity =>
        {
            entity.HasKey(e => e.HomeworkTypeId).HasName("PRIMARY");

            entity.ToTable("homework_type");

            entity.HasIndex(e => e.HomeworkId, "fk_homework_type_homework1_idx");

            entity.Property(e => e.HomeworkTypeId).HasColumnName("homework_type_id");
            entity.Property(e => e.HomeworkId).HasColumnName("homework_id");
            entity.Property(e => e.TypeName)
                .HasMaxLength(100)
                .HasColumnName("type_name");

            entity.HasOne(d => d.Homework).WithMany(p => p.HomeworkTypes)
                .HasForeignKey(d => d.HomeworkId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_homework_type_homework1");
        });

        modelBuilder.Entity<Lecture>(entity =>
        {
            entity.HasKey(e => e.LectureId).HasName("PRIMARY");

            entity.ToTable("lecture");

            entity.HasIndex(e => e.UserId, "fk_lecture_user1_idx");

            entity.Property(e => e.LectureId).HasColumnName("lecture_id");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Lectures)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lecture_user1");
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasKey(e => e.LessonId).HasName("PRIMARY");

            entity.ToTable("lesson");

            entity.HasIndex(e => e.ClassId, "fk_lesson_class1_idx");

            entity.HasIndex(e => e.LectureId, "fk_lesson_lecture1_idx");

            entity.HasIndex(e => e.RoomId, "fk_lesson_room1_idx");

            entity.HasIndex(e => e.TimeId, "fk_lesson_timeslot1_idx");

            entity.Property(e => e.LessonId).HasColumnName("lesson_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.LectureId).HasColumnName("lecture_id");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.TimeId).HasColumnName("time_id");

            entity.HasOne(d => d.Class).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_class1");

            entity.HasOne(d => d.Lecture).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.LectureId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_lecture1");

            entity.HasOne(d => d.Room).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.RoomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_room1");

            entity.HasOne(d => d.Time).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.TimeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_timeslot1");
        });

        modelBuilder.Entity<Level>(entity =>
        {
            entity.HasKey(e => e.LevelId).HasName("PRIMARY");

            entity.ToTable("level");

            entity.HasIndex(e => e.LevelName, "level_name").IsUnique();

            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.LevelName)
                .HasMaxLength(100)
                .HasColumnName("level_name");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PRIMARY");

            entity.ToTable("material");

            entity.HasIndex(e => e.UserId, "fk_material_user1_idx");

            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.CreateAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("create_at");
            entity.Property(e => e.CreateBy).HasColumnName("create_by");
            entity.Property(e => e.FilePath)
                .HasMaxLength(255)
                .HasColumnName("file_path");
            entity.Property(e => e.MaterialDescription)
                .HasColumnType("text")
                .HasColumnName("material_description");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdateAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("update_at");
            entity.Property(e => e.UpdateBy).HasColumnName("update_by");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Materials)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_material_user1");
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("news");

            entity.HasIndex(e => e.UserId, "fk_news_user1_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedTime)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_time");
            entity.Property(e => e.NewsImage)
                .HasMaxLength(255)
                .HasColumnName("news_image");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdateBy).HasColumnName("update_by");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.News)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_news_user1");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("notifications");

            entity.HasIndex(e => e.UserId, "fk_notifications_user1_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.CreatedTime)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_time");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_notifications_user1");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PRIMARY");

            entity.ToTable("role");

            entity.HasIndex(e => e.RoleName, "role_name").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.RoomId).HasName("PRIMARY");

            entity.ToTable("room");

            entity.HasIndex(e => e.RoomName, "RoomName").IsUnique();

            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.RoomName)
                .HasMaxLength(100)
                .HasColumnName("room_name");
        });

        modelBuilder.Entity<Semester>(entity =>
        {
            entity.HasKey(e => e.SemesterId).HasName("PRIMARY");

            entity.ToTable("semester");

            entity.Property(e => e.SemesterId).HasColumnName("semester_id");
            entity.Property(e => e.EndDate).HasColumnName("end_date");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.StudentId).HasName("PRIMARY");

            entity.ToTable("student");

            entity.HasIndex(e => e.LevelId, "fk_student_level1_idx");

            entity.HasIndex(e => e.UserId, "fk_student_user1_idx");

            entity.HasIndex(e => e.StudentCode, "student_code").IsUnique();

            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.StudentCode)
                .HasMaxLength(50)
                .HasColumnName("student_code");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.Level).WithMany(p => p.Students)
                .HasForeignKey(d => d.LevelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_student_level1");

            entity.HasOne(d => d.User).WithMany(p => p.Students)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_student_user1");

            entity.HasMany(d => d.Classes).WithMany(p => p.Students)
                .UsingEntity<Dictionary<string, object>>(
                    "Enrollment",
                    r => r.HasOne<Class>().WithMany()
                        .HasForeignKey("ClassId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_enrollment_class1"),
                    l => l.HasOne<Student>().WithMany()
                        .HasForeignKey("StudentId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("fk_enrollment_student1"),
                    j =>
                    {
                        j.HasKey("StudentId", "ClassId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("enrollment");
                        j.HasIndex(new[] { "ClassId" }, "fk_enrollment_class1_idx");
                        j.HasIndex(new[] { "StudentId" }, "fk_enrollment_student1_idx");
                        j.IndexerProperty<int>("StudentId").HasColumnName("student_id");
                        j.IndexerProperty<int>("ClassId").HasColumnName("class_id");
                    });
        });

        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.SubjectId).HasName("PRIMARY");

            entity.ToTable("subject");

            entity.HasIndex(e => e.ClassId, "fk_subject_class1_idx");

            entity.HasIndex(e => e.LevelId, "fk_subject_level1_idx");

            entity.HasIndex(e => e.SemesterId, "fk_subject_semester1_idx");

            entity.HasIndex(e => e.SubjectCode, "subject_code").IsUnique();

            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.PassMark)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("'0.00'")
                .HasColumnName("pass_mark");
            entity.Property(e => e.SemesterId).HasColumnName("semester_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.SubjectCode)
                .HasMaxLength(50)
                .HasColumnName("subject_code");
            entity.Property(e => e.SubjectName)
                .HasMaxLength(100)
                .HasColumnName("subject_name");

            entity.HasOne(d => d.Class).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_subject_class1");

            entity.HasOne(d => d.Level).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.LevelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_subject_level1");

            entity.HasOne(d => d.Semester).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.SemesterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_subject_semester1");
        });

        modelBuilder.Entity<Timeslot>(entity =>
        {
            entity.HasKey(e => e.TimeId).HasName("PRIMARY");

            entity.ToTable("timeslot");

            entity.Property(e => e.TimeId).HasColumnName("time_id");
            entity.Property(e => e.EndTime)
                .HasColumnType("time")
                .HasColumnName("end_time");
            entity.Property(e => e.StartTime)
                .HasColumnType("time")
                .HasColumnName("start_time");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PRIMARY");

            entity.ToTable("user");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.HasIndex(e => e.RoleId, "fk_user_role1_idx");

            entity.HasIndex(e => e.PhoneNumber, "phone_number").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Avatar)
                .HasMaxLength(255)
                .HasColumnName("avatar");
            entity.Property(e => e.Dob).HasColumnName("dob");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.FirstName)
                .HasMaxLength(50)
                .HasColumnName("first_name");
            entity.Property(e => e.Gender)
                .HasColumnType("enum('Male','Female','Other')")
                .HasColumnName("gender");
            entity.Property(e => e.LastName)
                .HasMaxLength(50)
                .HasColumnName("last_name");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .HasColumnName("phone_number");
            entity.Property(e => e.RoleId).HasColumnName("role_id");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_user_role1");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
