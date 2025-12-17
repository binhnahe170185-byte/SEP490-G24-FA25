using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace FJAP.vn.fpt.edu.models;

public partial class FjapDbContext : DbContext
{
    public FjapDbContext()
    {
    }

    public FjapDbContext(DbContextOptions<FjapDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Attendance> Attendances { get; set; }

    public virtual DbSet<Class> Classes { get; set; }

    public virtual DbSet<Department> Departments { get; set; }

    public virtual DbSet<DailyFeedback> DailyFeedbacks { get; set; }

    public virtual DbSet<Feedback> Feedbacks { get; set; }

    public virtual DbSet<FeedbackQuestion> FeedbackQuestions { get; set; }

    public virtual DbSet<Grade> Grades { get; set; }

    public virtual DbSet<GradeType> GradeTypes { get; set; }

    public virtual DbSet<Holiday> Holidays { get; set; }

    public virtual DbSet<Homework> Homeworks { get; set; }

    public virtual DbSet<HomeworkSubmission> HomeworkSubmissions { get; set; }

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


    public virtual DbSet<SubjectGradeType> SubjectGradeTypes { get; set; }

    public virtual DbSet<Timeslot> Timeslots { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseMySql("server=fjap.mysql.database.azure.com;port=3306;database=fjap_db;user=fjap_db;password=F@123456", Microsoft.EntityFrameworkCore.ServerVersion.Parse("8.0.42-mysql"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Attendance>(entity =>
        {
            entity.HasKey(e => e.AttendanceId).HasName("PRIMARY");

            entity.ToTable("attendance");

            entity.HasIndex(e => e.LessonId, "idx_att_lesson");

            entity.HasIndex(e => e.StudentId, "idx_att_student");

            entity.Property(e => e.AttendanceId).HasColumnName("attendance_id");
            entity.Property(e => e.LessonId).HasColumnName("lesson_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Present'")
                .HasColumnType("enum('Present','Absent','Not Yet')")
                .HasColumnType("enum('Present','Absent','Not Yet')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.TimeAttendance)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("time_attendance");

            entity.HasOne(d => d.Lesson).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.LessonId)
                .HasConstraintName("fk_attendance_lesson");

            entity.HasOne(d => d.Student).WithMany(p => p.Attendances)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_attendance_student");
        });

        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasKey(e => e.ClassId).HasName("PRIMARY");

            entity.ToTable("class");

            entity.HasIndex(e => e.SubjectId, "fk_class_subject1_idx");

            entity.HasIndex(e => e.LevelId, "idx_class_level");

            entity.HasIndex(e => e.SemesterId, "idx_class_semester");

            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.ClassName)
                .HasMaxLength(100)
                .HasColumnName("class_name");
            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.MaxStudents).HasColumnName("max_students");
            entity.Property(e => e.MinStudents).HasColumnName("min_students");
            entity.Property(e => e.MaxStudents).HasColumnName("max_students");
            entity.Property(e => e.MinStudents).HasColumnName("min_students");
            entity.Property(e => e.SemesterId).HasColumnName("semester_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Inactive'")
                .HasDefaultValueSql("'Inactive'")
                .HasColumnType("enum('Active','Inactive')");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Level).WithMany(p => p.Classes)
                .HasForeignKey(d => d.LevelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_class_level");

            entity.HasOne(d => d.Semester).WithMany(p => p.Classes)
                .HasForeignKey(d => d.SemesterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_class_semester");

            entity.HasOne(d => d.Subject).WithMany(p => p.Classes)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_class_subject1");
        });

        modelBuilder.Entity<Department>(entity =>
        {
            entity.HasKey(e => e.DepartmentId).HasName("PRIMARY");

            entity.ToTable("department");

            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
            entity.Property(e => e.DepartmentName)
                .HasMaxLength(45)
                .HasColumnName("department_name");
        });

        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("feedbacks", tb => tb.HasComment("Bảng lưu feedback của student và kết quả AI analysis"));

            entity.HasIndex(e => e.ClassId, "idx_feedback_class");

            entity.HasIndex(e => e.CreatedAt, "idx_feedback_created");

            entity.HasIndex(e => e.Sentiment, "idx_feedback_sentiment");

            entity.HasIndex(e => e.Status, "idx_feedback_status");

            entity.HasIndex(e => e.StudentId, "idx_feedback_student");

            entity.HasIndex(e => e.SubjectId, "idx_feedback_subject");

            entity.HasIndex(e => e.Urgency, "idx_feedback_urgency");

            entity.HasIndex(e => e.IssueCategory, "idx_feedbacks_issue_category");

            entity.HasIndex(e => e.CategoryCode, "idx_feedback_category_code");

            entity.HasIndex(e => e.AnalyzedAt, "idx_feedback_analyzed_at");

            entity.HasIndex(e => new { e.StudentId, e.ClassId }, "uk_feedback_student_class").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Answers)
                .HasComment("Map of questionId to answer value (1-4)")
                .HasColumnType("json")
                .HasColumnName("answers");
            entity.Property(e => e.ClassId)
                .HasComment("ID của class được feedback")
                .HasColumnName("class_id");
            entity.Property(e => e.CategoryCode)
                .HasMaxLength(20)
                .HasComment("New 8-category code (C1..F1 or UNK)")
                .HasColumnName("category_code");
            entity.Property(e => e.CategoryConfidence)
                .HasPrecision(4, 2)
                .HasComment("Confidence returned by AI for category classification (0..1)")
                .HasColumnName("category_confidence");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(200)
                .HasComment("Display name of the category (aligned with CategoryCode)")
                .HasColumnName("category_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FreeText)
                .HasComment("Mô tả thêm vấn đề (tối đa 1200 ký tự)")
                .HasColumnType("text")
                .HasColumnName("free_text");
            entity.Property(e => e.FreeTextTranscript)
                .HasComment("Transcript từ speech-to-text (nếu có)")
                .HasColumnType("text")
                .HasColumnName("free_text_transcript");
            entity.Property(e => e.AiReason)
                .HasColumnType("text")
                .HasComment("Detailed reasoning/explanation returned by AI")
                .HasColumnName("ai_reason");
            entity.Property(e => e.AnalyzedAt)
                .HasColumnType("datetime")
                .HasComment("Timestamp when feedback was last analyzed by AI")
                .HasColumnName("analyzed_at");
            entity.Property(e => e.IssueCategory)
                .HasMaxLength(50)
                .HasComment("Category code for feedback issue (e.g., ASSESSMENT_LOAD, FACILITY_ISSUES)")
                .HasColumnName("issue_category");
            entity.Property(e => e.MainIssue)
                .HasMaxLength(500)
                .HasComment("Vấn đề chính được AI phát hiện")
                .HasColumnName("main_issue");
            entity.Property(e => e.SatisfactionScore)
                .HasPrecision(3, 2)
                .HasComment("0.00 - 1.00")
                .HasColumnName("satisfaction_score");
            entity.Property(e => e.Sentiment)
                .HasDefaultValueSql("'Neutral'")
                .HasColumnType("enum('Positive','Neutral','Negative')")
                .HasColumnName("sentiment");
            entity.Property(e => e.SentimentScore)
                .HasPrecision(3, 2)
                .HasComment("-1.00 đến 1.00")
                .HasColumnName("sentiment_score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'New'")
                .HasColumnType("enum('New','Reviewed','Actioned')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId)
                .HasComment("ID của student gửi feedback")
                .HasColumnName("student_id");
            entity.Property(e => e.SubjectId)
                .HasComment("ID của subject được feedback")
                .HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.Urgency)
                .HasComment("0-10, urgency >= 7 sẽ gửi notification")
                .HasColumnName("urgency");
            entity.Property(e => e.WantsOneToOne)
                .HasComment("1 = Có muốn hỗ trợ 1-1, 0 = Không")
                .HasColumnName("wants_one_to_one");

            entity.HasOne(d => d.Class).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("fk_feedback_class");

            entity.HasOne(d => d.Student).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_feedback_student");

            entity.HasOne(d => d.Subject).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("fk_feedback_subject");
        });

        modelBuilder.Entity<DailyFeedback>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("dailyfeedbacks", tb => tb.HasComment("Bảng lưu daily feedback của student cho từng lesson"));

            entity.HasIndex(e => e.ClassId, "idx_daily_feedback_class");
            entity.HasIndex(e => e.CreatedAt, "idx_daily_feedback_created");
            entity.HasIndex(e => e.LessonId, "idx_daily_feedback_lesson");
            entity.HasIndex(e => e.StudentId, "idx_daily_feedback_student");
            entity.HasIndex(e => e.SubjectId, "idx_daily_feedback_subject");
            entity.HasIndex(e => e.Sentiment, "idx_daily_feedback_sentiment");
            entity.HasIndex(e => e.Status, "idx_daily_feedback_status");
            entity.HasIndex(e => new { e.StudentId, e.LessonId }, "uk_daily_feedback_student_lesson").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.StudentId)
                .HasComment("ID của student gửi feedback")
                .HasColumnName("student_id");
            entity.Property(e => e.LessonId)
                .HasComment("ID của lesson được feedback")
                .HasColumnName("lesson_id");
            entity.Property(e => e.ClassId)
                .HasComment("ID của class")
                .HasColumnName("class_id");
            entity.Property(e => e.SubjectId)
                .HasComment("ID của subject")
                .HasColumnName("subject_id");
            entity.Property(e => e.FeedbackText)
                .HasComment("Nội dung feedback")
                .HasColumnType("text")
                .HasColumnName("feedback_text");
            entity.Property(e => e.FeedbackTextTranscript)
                .HasComment("Transcript từ speech-to-text (nếu có)")
                .HasColumnType("text")
                .HasColumnName("feedback_text_transcript");
            entity.Property(e => e.Sentiment)
                .HasMaxLength(50)
                .HasDefaultValueSql("'Neutral'")
                .HasColumnName("sentiment");
            entity.Property(e => e.Urgency)
                .HasComment("0-10, urgency >= 7 sẽ gửi notification")
                .HasColumnName("urgency");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValueSql("'New'")
                .HasColumnName("status");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Student).WithMany()
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_daily_feedback_student");

            entity.HasOne(d => d.Lesson).WithMany()
                .HasForeignKey(d => d.LessonId)
                .HasConstraintName("fk_daily_feedback_lesson");

            entity.HasOne(d => d.Class).WithMany()
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("fk_daily_feedback_class");

            entity.HasOne(d => d.Subject).WithMany()
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("fk_daily_feedback_subject");
        });

       
        modelBuilder.Entity<Feedback>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("feedbacks", tb => tb.HasComment("Bảng lưu feedback của student và kết quả AI analysis"));

            entity.HasIndex(e => e.ClassId, "idx_feedback_class");

            entity.HasIndex(e => e.CreatedAt, "idx_feedback_created");

            entity.HasIndex(e => e.Sentiment, "idx_feedback_sentiment");

            entity.HasIndex(e => e.Status, "idx_feedback_status");

            entity.HasIndex(e => e.StudentId, "idx_feedback_student");

            entity.HasIndex(e => e.SubjectId, "idx_feedback_subject");

            entity.HasIndex(e => e.Urgency, "idx_feedback_urgency");

            entity.HasIndex(e => e.IssueCategory, "idx_feedbacks_issue_category");

            entity.HasIndex(e => new { e.StudentId, e.ClassId }, "uk_feedback_student_class").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Answers)
                .HasComment("Map of questionId to answer value (1-4)")
                .HasColumnType("json")
                .HasColumnName("answers");
            entity.Property(e => e.ClassId)
                .HasComment("ID của class được feedback")
                .HasColumnName("class_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FreeText)
                .HasComment("Mô tả thêm vấn đề (tối đa 1200 ký tự)")
                .HasColumnType("text")
                .HasColumnName("free_text");
            entity.Property(e => e.FreeTextTranscript)
                .HasComment("Transcript từ speech-to-text (nếu có)")
                .HasColumnType("text")
                .HasColumnName("free_text_transcript");
            entity.Property(e => e.IssueCategory)
                .HasMaxLength(50)
                .HasComment("Category code for feedback issue (e.g., ASSESSMENT_LOAD, FACILITY_ISSUES)")
                .HasColumnName("issue_category");
            entity.Property(e => e.MainIssue)
                .HasMaxLength(500)
                .HasComment("Vấn đề chính được AI phát hiện")
                .HasColumnName("main_issue");
            entity.Property(e => e.SatisfactionScore)
                .HasPrecision(3, 2)
                .HasComment("0.00 - 1.00")
                .HasColumnName("satisfaction_score");
            entity.Property(e => e.Sentiment)
                .HasDefaultValueSql("'Neutral'")
                .HasColumnType("enum('Positive','Neutral','Negative')")
                .HasColumnName("sentiment");
            entity.Property(e => e.SentimentScore)
                .HasPrecision(3, 2)
                .HasComment("-1.00 đến 1.00")
                .HasColumnName("sentiment_score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'New'")
                .HasColumnType("enum('New','Reviewed','Actioned')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId)
                .HasComment("ID của student gửi feedback")
                .HasColumnName("student_id");
            entity.Property(e => e.SubjectId)
                .HasComment("ID của subject được feedback")
                .HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.Urgency)
                .HasComment("0-10, urgency >= 7 sẽ gửi notification")
                .HasColumnName("urgency");
            entity.Property(e => e.WantsOneToOne)
                .HasComment("1 = Có muốn hỗ trợ 1-1, 0 = Không")
                .HasColumnName("wants_one_to_one");

            entity.HasOne(d => d.Class).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.ClassId)
                .HasConstraintName("fk_feedback_class");

            entity.HasOne(d => d.Student).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_feedback_student");

            entity.HasOne(d => d.Subject).WithMany(p => p.Feedbacks)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("fk_feedback_subject");
        });

        modelBuilder.Entity<FeedbackQuestion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("feedback_questions", tb => tb.HasComment("Bảng quản lý câu hỏi feedback (Academic Staff có thể tạo/sửa)"));

            entity.HasIndex(e => e.IsActive, "idx_fq_active");

            entity.HasIndex(e => e.OrderIndex, "idx_fq_order");

            entity.HasIndex(e => e.SubjectId, "idx_fq_subject");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AnswerOptions)
                .HasComment("Array of answer options: [{value, label, icon, color}]")
                .HasColumnType("json")
                .HasColumnName("answer_options");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EvaluationLabel)
                .HasMaxLength(200)
                .HasColumnName("evaluation_label");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasComment("1 = Active, 0 = Inactive")
                .HasColumnName("is_active");
            entity.Property(e => e.OrderIndex)
                .HasComment("Thứ tự hiển thị (1, 2, 3...)")
                .HasColumnName("order_index");
            entity.Property(e => e.QuestionText)
                .HasMaxLength(500)
                .HasComment("Nội dung câu hỏi")
                .HasColumnName("question_text");
            entity.Property(e => e.SubjectId)
                .HasComment("NULL = áp dụng cho tất cả môn, có giá trị = chỉ áp dụng cho môn đó")
                .HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Subject).WithMany(p => p.FeedbackQuestions)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_feedback_question_subject");
        });

        modelBuilder.Entity<Grade>(entity =>
        {
            entity.HasKey(e => e.GradeId).HasName("PRIMARY");

            entity.ToTable("grade");

            entity.HasIndex(e => e.StudentId, "idx_grade_student");

            entity.HasIndex(e => e.SubjectId, "idx_grade_subject");

            entity.HasIndex(e => new { e.StudentId, e.SubjectId }, "uk_student_subject").IsUnique();

            entity.Property(e => e.GradeId).HasColumnName("grade_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FinalScore)
                .HasPrecision(5, 2)
                .HasComment("Điểm tổng kết (tự động tính)")
                .HasColumnName("final_score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'In Progress'")
                .HasColumnType("enum('In Progress',' Passed','Failed')")
                .HasColumnName("status");
            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Student).WithMany(p => p.Grades)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_grade_student");

            entity.HasOne(d => d.Subject).WithMany(p => p.Grades)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("fk_grade_subject");
        });

        modelBuilder.Entity<GradeType>(entity =>
        {
            entity.HasKey(e => e.GradeTypeId).HasName("PRIMARY");

            entity.ToTable("grade_type");

            entity.HasIndex(e => e.GradeId, "idx_gt_grade");

            entity.HasIndex(e => e.GradedBy, "idx_gt_grader");

            entity.HasIndex(e => e.SubjectGradeTypeId, "idx_gt_sgt");

            entity.HasIndex(e => new { e.GradeId, e.SubjectGradeTypeId }, "uk_grade_detail").IsUnique();

            entity.Property(e => e.GradeTypeId).HasColumnName("grade_type_id");
            entity.Property(e => e.Comment)
                .HasComment("Nhận xét của giảng viên")
                .HasColumnType("text")
                .HasColumnName("comment");
            entity.Property(e => e.GradeId).HasColumnName("grade_id");
            entity.Property(e => e.GradedAt)
                .HasColumnType("datetime")
                .HasColumnName("graded_at");
            entity.Property(e => e.GradedBy)
                .HasComment("Lecturer ID đã chấm")
                .HasColumnName("graded_by");
            entity.Property(e => e.Score)
                .HasPrecision(5, 2)
                .HasComment("Điểm thực tế của sinh viên")
                .HasColumnName("score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Pending'")
                .HasColumnType("enum('Pending','Graded','Revised')")
                .HasColumnName("status");
            entity.Property(e => e.SubjectGradeTypeId).HasColumnName("subject_grade_type_id");

            entity.HasOne(d => d.Grade).WithMany(p => p.GradeTypes)
                .HasForeignKey(d => d.GradeId)
                .HasConstraintName("fk_grade_type_grade");

            entity.HasOne(d => d.SubjectGradeType).WithMany(p => p.GradeTypes)
                .HasForeignKey(d => d.SubjectGradeTypeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_grade_type_sgt");
        });

        modelBuilder.Entity<Holiday>(entity =>
        {
            entity.HasKey(e => e.HolidayId).HasName("PRIMARY");

            entity.ToTable("holiday");

            entity.HasIndex(e => e.HolidayDate, "idx_holiday_date");

            entity.HasIndex(e => e.SemesterId, "idx_holiday_semester");

            entity.HasIndex(e => new { e.SemesterId, e.HolidayDate }, "idx_holiday_semester_date");

            entity.Property(e => e.HolidayId).HasColumnName("holidayId");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.HolidayDate).HasColumnName("holidayDate");
            entity.Property(e => e.HolidayName)
                .HasMaxLength(200)
                .HasColumnName("holidayName");
            entity.Property(e => e.SemesterId).HasColumnName("semesterId");

            entity.HasOne(d => d.Semester).WithMany(p => p.Holidays)
                .HasForeignKey(d => d.SemesterId)
                .HasConstraintName("holiday_ibfk_1");
        });

        modelBuilder.Entity<Homework>(entity =>
        {
            entity.HasKey(e => e.HomeworkId).HasName("PRIMARY");

            entity.ToTable("homework");

            entity.HasIndex(e => e.LessonId, "idx_homework_lesson");

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
                .HasConstraintName("fk_homework_lesson");
        });

        modelBuilder.Entity<HomeworkSubmission>(entity =>
        {
            entity.HasKey(e => e.HomeworkSubmissionId).HasName("PRIMARY");

            entity.ToTable("homework_submission");

            entity.HasIndex(e => e.HomeworkId, "idx_hws_homework");

            entity.HasIndex(e => e.StudentId, "idx_hws_student");

            entity.Property(e => e.HomeworkSubmissionId).HasColumnName("homework_submission_id");
            entity.Property(e => e.Comment)
                .HasColumnType("text")
                .HasColumnName("comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
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
                .HasConstraintName("fk_hws_homework");

            entity.HasOne(d => d.Student).WithMany(p => p.HomeworkSubmissions)
                .HasForeignKey(d => d.StudentId)
                .HasConstraintName("fk_hws_student");
        });

        modelBuilder.Entity<Lecture>(entity =>
        {
            entity.HasKey(e => e.LectureId).HasName("PRIMARY");

            entity.ToTable("lecture");

            entity.HasIndex(e => e.UserId, "idx_lecture_user");

            entity.Property(e => e.LectureId).HasColumnName("lecture_id");
            entity.Property(e => e.LecturerCode)
                .HasMaxLength(255)
                .HasColumnName("lecturer_code");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Lectures)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lecture_user");
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasKey(e => e.LessonId).HasName("PRIMARY");

            entity.ToTable("lesson");

            entity.HasIndex(e => e.ClassId, "idx_lesson_class");

            entity.HasIndex(e => e.LectureId, "idx_lesson_lecture");

            entity.HasIndex(e => e.RoomId, "idx_lesson_room");

            entity.HasIndex(e => e.TimeId, "idx_lesson_time");

            entity.Property(e => e.LessonId).HasColumnName("lesson_id");
            entity.Property(e => e.ClassId).HasColumnName("class_id");
            entity.Property(e => e.Date).HasColumnName("date");
            entity.Property(e => e.LectureId).HasColumnName("lecture_id");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.TimeId).HasColumnName("time_id");

            entity.HasOne(d => d.Class).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.ClassId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_class");

            entity.HasOne(d => d.Lecture).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.LectureId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_lecture");

            entity.HasOne(d => d.Room).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.RoomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_room");

            entity.HasOne(d => d.Time).WithMany(p => p.Lessons)
                .HasForeignKey(d => d.TimeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_lesson_timeslot");
        });

        modelBuilder.Entity<Level>(entity =>
        {
            entity.HasKey(e => e.LevelId).HasName("PRIMARY");

            entity.ToTable("level");

            entity.HasIndex(e => e.LevelName, "uk_level_name").IsUnique();

            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.LevelName)
                .HasMaxLength(100)
                .HasColumnName("level_name");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PRIMARY");

            entity.ToTable("material");

            entity.HasIndex(e => e.CreatedBy, "fk_material_created_by");

            entity.HasIndex(e => e.UpdatedBy, "fk_material_updated_by");

            entity.HasIndex(e => e.CreatedAt, "idx_material_created_at");

            entity.HasIndex(e => e.Status, "idx_material_status");

            entity.HasIndex(e => e.SubjectId, "idx_material_subject");

            entity.Property(e => e.MaterialId).HasColumnName("material_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.FileUrl)
                .HasColumnType("text")
                .HasColumnName("file_url");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'active'")
                .HasColumnType("enum('active','inActive')")
                .HasColumnName("status");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.MaterialCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_material_created_by");

            entity.HasOne(d => d.Subject).WithMany(p => p.Materials)
                .HasForeignKey(d => d.SubjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_material_subject");

            entity.HasOne(d => d.UpdatedByNavigation).WithMany(p => p.MaterialUpdatedByNavigations)
                .HasForeignKey(d => d.UpdatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_material_updated_by");
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("news");

            entity.HasIndex(e => e.ApprovedBy, "fk_news_approved_by");

            entity.HasIndex(e => e.CreatedBy, "fk_news_created_by");

            entity.HasIndex(e => e.UpdatedBy, "fk_news_updated_by");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ApprovedAt)
                .HasColumnType("datetime")
                .HasColumnName("approved_at");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.NewsImage).HasColumnName("news_image");
            entity.Property(e => e.NewsImage).HasColumnName("news_image");
            entity.Property(e => e.ReviewComment)
                .HasColumnType("text")
                .HasColumnName("review_comment");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'draft'")
                .HasColumnType("enum('draft','pending','published','rejected')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.NewsApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_news_approved_by");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.NewsCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_news_created_by");

            entity.HasOne(d => d.UpdatedByNavigation).WithMany(p => p.NewsUpdatedByNavigations)
                .HasForeignKey(d => d.UpdatedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_news_updated_by");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("notifications");

            entity.HasIndex(e => e.UserId, "idx_notif_user");

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
                .HasConstraintName("fk_notifications_user");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PRIMARY");

            entity.ToTable("role");

            entity.HasIndex(e => e.RoleName, "uk_role_name").IsUnique();

            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.RoomId).HasName("PRIMARY");

            entity.ToTable("room");

            entity.HasIndex(e => e.RoomName, "uk_room_name").IsUnique();

            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.RoomName)
                .HasMaxLength(100)
                .HasColumnName("room_name");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')");
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
            entity.Property(e => e.SemesterCode)
                .HasMaxLength(20)
                .HasDefaultValueSql("''")
                .HasColumnName("semester_code");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
        });

        modelBuilder.Entity<Student>(entity =>
        {
            entity.HasKey(e => e.StudentId).HasName("PRIMARY");

            entity.ToTable("student");

            entity.HasIndex(e => e.LevelId, "idx_student_level");

            entity.HasIndex(e => e.SemesterId, "idx_student_semester");

            entity.HasIndex(e => e.UserId, "idx_student_user");

            entity.HasIndex(e => e.StudentCode, "uk_student_code").IsUnique();

            entity.Property(e => e.StudentId).HasColumnName("student_id");
            entity.Property(e => e.EnrollmentDate).HasColumnName("enrollment_date");
            entity.Property(e => e.LevelId).HasColumnName("level_id");
            entity.Property(e => e.SemesterId).HasColumnName("semester_id");
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
                .HasConstraintName("fk_student_level");

            entity.HasOne(d => d.Semester).WithMany(p => p.Students)
                .HasForeignKey(d => d.SemesterId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_student_semester");

            entity.HasOne(d => d.User).WithMany(p => p.Students)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_student_user");

            entity.HasMany(d => d.Classes).WithMany(p => p.Students)
                .UsingEntity<Dictionary<string, object>>(
                    "Enrollment",
                    r => r.HasOne<Class>().WithMany()
                        .HasForeignKey("ClassId")
                        .HasConstraintName("fk_enrollment_class"),
                    l => l.HasOne<Student>().WithMany()
                        .HasForeignKey("StudentId")
                        .HasConstraintName("fk_enrollment_student"),
                    j =>
                    {
                        j.HasKey("StudentId", "ClassId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j.ToTable("enrollment");
                        j.HasIndex(new[] { "ClassId" }, "idx_enroll_class");
                        j.HasIndex(new[] { "StudentId" }, "idx_enroll_student");
                        j.IndexerProperty<int>("StudentId").HasColumnName("student_id");
                        j.IndexerProperty<int>("ClassId").HasColumnName("class_id");
                    });
        });


        modelBuilder.Entity<Subject>(entity =>
        {
            entity.HasKey(e => e.SubjectId).HasName("PRIMARY");

            entity
                .ToTable("subject")
                .UseCollation("utf8mb4_croatian_ci");

            entity.HasIndex(e => e.LevelId, "idx_subject_level");

            entity.HasIndex(e => e.SubjectCode, "uk_subject_code").IsUnique();

            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
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
            entity.Property(e => e.TotalLesson).HasColumnName("total_lesson");

            entity.HasOne(d => d.Level).WithMany(p => p.Subjects)
                .HasForeignKey(d => d.LevelId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_subject_level");
        });

        modelBuilder.Entity<SubjectGradeType>(entity =>
        {
            entity.HasKey(e => e.SubjectGradeTypeId).HasName("PRIMARY");

            entity.ToTable("subject_grade_type");

            entity.HasIndex(e => e.SubjectId, "idx_sgt_subject");

            entity.HasIndex(e => new { e.SubjectId, e.GradeTypeName }, "uk_subject_grade_type").IsUnique();

            entity.Property(e => e.SubjectGradeTypeId).HasColumnName("subject_grade_type_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Manager ID tạo cấu hình")
                .HasColumnName("created_by");
            entity.Property(e => e.GradeTypeName)
                .HasMaxLength(100)
                .HasComment("Quiz, Assignment, Midterm, Final, etc.")
                .HasColumnName("grade_type_name");
            entity.Property(e => e.MaxScore)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("'10.00'")
                .HasComment("Điểm tối đa (thường là 10)")
                .HasColumnName("max_score");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.SubjectId).HasColumnName("subject_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.Weight)
                .HasPrecision(5, 2)
                .HasComment("Tỷ trọng % (0-100)")
                .HasColumnName("weight");

            entity.HasOne(d => d.Subject).WithMany(p => p.SubjectGradeTypes)
                .HasForeignKey(d => d.SubjectId)
                .HasConstraintName("fk_sgt_subject");
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

            entity.HasIndex(e => e.DepartmentId, "fk_user_department1_idx");

            entity.HasIndex(e => e.RoleId, "idx_user_role");

            entity.HasIndex(e => e.Email, "uk_user_email").IsUnique();

            entity.HasIndex(e => e.PhoneNumber, "uk_user_phone").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.Avatar)
                .HasColumnType("text")
                .HasColumnName("avatar");
            entity.Property(e => e.DepartmentId).HasColumnName("department_id");
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
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");

            entity.HasOne(d => d.Department).WithMany(p => p.Users)
                .HasForeignKey(d => d.DepartmentId)
                .HasConstraintName("fk_user_department1");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_user_role");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
