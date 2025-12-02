using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FJAP.Migrations
{
    /// <inheritdoc />
    public partial class AddClassMinMaxStudents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "department",
                columns: table => new
                {
                    department_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    department_name = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.department_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "level",
                columns: table => new
                {
                    level_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    level_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.level_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "role",
                columns: table => new
                {
                    role_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    role_name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.role_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "room",
                columns: table => new
                {
                    room_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    room_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "enum('Active','Inactive')", nullable: false, defaultValueSql: "'Active'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.room_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "semester",
                columns: table => new
                {
                    semester_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    semester_code = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, defaultValueSql: "''", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.semester_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "timeslot",
                columns: table => new
                {
                    time_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    start_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.time_id);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "subject",
                columns: table => new
                {
                    subject_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    subject_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_croatian_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    subject_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_croatian_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('Active','Inactive')", nullable: true, defaultValueSql: "'Active'", collation: "utf8mb4_croatian_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_croatian_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    pass_mark = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true, defaultValueSql: "'0.00'"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    level_id = table.Column<int>(type: "int", nullable: false),
                    total_lesson = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.subject_id);
                    table.ForeignKey(
                        name: "fk_subject_level",
                        column: x => x.level_id,
                        principalTable: "level",
                        principalColumn: "level_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_croatian_ci");

            migrationBuilder.CreateTable(
                name: "user",
                columns: table => new
                {
                    user_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    first_name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    address = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    gender = table.Column<string>(type: "enum('Male','Female','Other')", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    avatar = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    dob = table.Column<DateOnly>(type: "date", nullable: false),
                    phone_number = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    role_id = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "enum('Active','Inactive')", nullable: false, defaultValueSql: "'Active'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    department_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_user_department1",
                        column: x => x.department_id,
                        principalTable: "department",
                        principalColumn: "department_id");
                    table.ForeignKey(
                        name: "fk_user_role",
                        column: x => x.role_id,
                        principalTable: "role",
                        principalColumn: "role_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "holiday",
                columns: table => new
                {
                    holidayId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    semesterId = table.Column<int>(type: "int", nullable: false),
                    holidayName = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    holidayDate = table.Column<DateOnly>(type: "date", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.holidayId);
                    table.ForeignKey(
                        name: "holiday_ibfk_1",
                        column: x => x.semesterId,
                        principalTable: "semester",
                        principalColumn: "semester_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "class",
                columns: table => new
                {
                    class_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    class_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    semester_id = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "enum('Active','Inactive')", nullable: true, defaultValueSql: "'Inactive'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    level_id = table.Column<int>(type: "int", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    subject_id = table.Column<int>(type: "int", nullable: false),
                    max_students = table.Column<int>(type: "int", nullable: true),
                    min_students = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.class_id);
                    table.ForeignKey(
                        name: "fk_class_level",
                        column: x => x.level_id,
                        principalTable: "level",
                        principalColumn: "level_id");
                    table.ForeignKey(
                        name: "fk_class_semester",
                        column: x => x.semester_id,
                        principalTable: "semester",
                        principalColumn: "semester_id");
                    table.ForeignKey(
                        name: "fk_class_subject1",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "feedback_questions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    question_text = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false, comment: "Nội dung câu hỏi", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    evaluation_label = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    order_index = table.Column<int>(type: "int", nullable: false, comment: "Thứ tự hiển thị (1, 2, 3...)"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValueSql: "'1'", comment: "1 = Active, 0 = Inactive"),
                    subject_id = table.Column<int>(type: "int", nullable: true, comment: "NULL = áp dụng cho tất cả môn, có giá trị = chỉ áp dụng cho môn đó"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    answer_options = table.Column<string>(type: "json", nullable: true, comment: "Array of answer options: [{value, label, icon, color}]", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_feedback_question_subject",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id",
                        onDelete: ReferentialAction.SetNull);
                },
                comment: "Bảng quản lý câu hỏi feedback (Academic Staff có thể tạo/sửa)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "subject_grade_type",
                columns: table => new
                {
                    subject_grade_type_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    subject_id = table.Column<int>(type: "int", nullable: false),
                    grade_type_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false, comment: "Quiz, Assignment, Midterm, Final, etc.", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    weight = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false, comment: "Tỷ trọng % (0-100)"),
                    max_score = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false, defaultValueSql: "'10.00'", comment: "Điểm tối đa (thường là 10)"),
                    status = table.Column<string>(type: "enum('Active','Inactive')", nullable: true, defaultValueSql: "'Active'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_by = table.Column<int>(type: "int", nullable: true, comment: "Manager ID tạo cấu hình"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.subject_grade_type_id);
                    table.ForeignKey(
                        name: "fk_sgt_subject",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lecture",
                columns: table => new
                {
                    lecture_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    lecturer_code = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.lecture_id);
                    table.ForeignKey(
                        name: "fk_lecture_user",
                        column: x => x.user_id,
                        principalTable: "user",
                        principalColumn: "user_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "material",
                columns: table => new
                {
                    material_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_url = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    status = table.Column<string>(type: "enum('active','inActive')", nullable: true, defaultValueSql: "'active'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<int>(type: "int", nullable: true),
                    updated_by = table.Column<int>(type: "int", nullable: true),
                    subject_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.material_id);
                    table.ForeignKey(
                        name: "fk_material_created_by",
                        column: x => x.created_by,
                        principalTable: "user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_material_subject",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id");
                    table.ForeignKey(
                        name: "fk_material_updated_by",
                        column: x => x.updated_by,
                        principalTable: "user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "news",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    news_image = table.Column<string>(type: "longtext", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('draft','pending','published','rejected')", nullable: false, defaultValueSql: "'draft'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    review_comment = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_by = table.Column<int>(type: "int", nullable: true),
                    updated_by = table.Column<int>(type: "int", nullable: true),
                    approved_by = table.Column<int>(type: "int", nullable: true),
                    approved_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_news_approved_by",
                        column: x => x.approved_by,
                        principalTable: "user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_news_created_by",
                        column: x => x.created_by,
                        principalTable: "user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_news_updated_by",
                        column: x => x.updated_by,
                        principalTable: "user",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    created_time = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    created_by = table.Column<int>(type: "int", nullable: true),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_notifications_user",
                        column: x => x.user_id,
                        principalTable: "user",
                        principalColumn: "user_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "student",
                columns: table => new
                {
                    student_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_code = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('Active','Inactive')", nullable: true, defaultValueSql: "'Active'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    level_id = table.Column<int>(type: "int", nullable: false),
                    semester_id = table.Column<int>(type: "int", nullable: true),
                    enrollment_date = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.student_id);
                    table.ForeignKey(
                        name: "fk_student_level",
                        column: x => x.level_id,
                        principalTable: "level",
                        principalColumn: "level_id");
                    table.ForeignKey(
                        name: "fk_student_semester",
                        column: x => x.semester_id,
                        principalTable: "semester",
                        principalColumn: "semester_id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_student_user",
                        column: x => x.user_id,
                        principalTable: "user",
                        principalColumn: "user_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lesson",
                columns: table => new
                {
                    lesson_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    class_id = table.Column<int>(type: "int", nullable: false),
                    room_id = table.Column<int>(type: "int", nullable: false),
                    time_id = table.Column<int>(type: "int", nullable: false),
                    lecture_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.lesson_id);
                    table.ForeignKey(
                        name: "fk_lesson_class",
                        column: x => x.class_id,
                        principalTable: "class",
                        principalColumn: "class_id");
                    table.ForeignKey(
                        name: "fk_lesson_lecture",
                        column: x => x.lecture_id,
                        principalTable: "lecture",
                        principalColumn: "lecture_id");
                    table.ForeignKey(
                        name: "fk_lesson_room",
                        column: x => x.room_id,
                        principalTable: "room",
                        principalColumn: "room_id");
                    table.ForeignKey(
                        name: "fk_lesson_timeslot",
                        column: x => x.time_id,
                        principalTable: "timeslot",
                        principalColumn: "time_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "enrollment",
                columns: table => new
                {
                    student_id = table.Column<int>(type: "int", nullable: false),
                    class_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => new { x.student_id, x.class_id })
                        .Annotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                    table.ForeignKey(
                        name: "fk_enrollment_class",
                        column: x => x.class_id,
                        principalTable: "class",
                        principalColumn: "class_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_enrollment_student",
                        column: x => x.student_id,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "feedbacks",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<int>(type: "int", nullable: false, comment: "ID của student gửi feedback"),
                    class_id = table.Column<int>(type: "int", nullable: false, comment: "ID của class được feedback"),
                    subject_id = table.Column<int>(type: "int", nullable: false, comment: "ID của subject được feedback"),
                    wants_one_to_one = table.Column<bool>(type: "tinyint(1)", nullable: false, comment: "1 = Có muốn hỗ trợ 1-1, 0 = Không"),
                    free_text = table.Column<string>(type: "text", nullable: true, comment: "Mô tả thêm vấn đề (tối đa 1200 ký tự)", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    free_text_transcript = table.Column<string>(type: "text", nullable: true, comment: "Transcript từ speech-to-text (nếu có)", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    satisfaction_score = table.Column<decimal>(type: "decimal(3,2)", precision: 3, scale: 2, nullable: false, comment: "0.00 - 1.00"),
                    sentiment = table.Column<string>(type: "enum('Positive','Neutral','Negative')", nullable: false, defaultValueSql: "'Neutral'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sentiment_score = table.Column<decimal>(type: "decimal(3,2)", precision: 3, scale: 2, nullable: true, comment: "-1.00 đến 1.00"),
                    keywords = table.Column<string>(type: "json", nullable: true, comment: "Array các keywords từ AI", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ai_suggestions = table.Column<string>(type: "json", nullable: true, comment: "Array các suggestions từ AI (1-3 items)", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    urgency = table.Column<int>(type: "int", nullable: false, comment: "0-10, urgency >= 7 sẽ gửi notification"),
                    main_issue = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true, comment: "Vấn đề chính được AI phát hiện", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('New','Reviewed','Actioned')", nullable: false, defaultValueSql: "'New'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn),
                    answers = table.Column<string>(type: "json", nullable: true, comment: "Map of questionId to answer value (1-4)", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    issue_category = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true, comment: "Category code for feedback issue (e.g., ASSESSMENT_LOAD, FACILITY_ISSUES)", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.id);
                    table.ForeignKey(
                        name: "fk_feedback_class",
                        column: x => x.class_id,
                        principalTable: "class",
                        principalColumn: "class_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_feedback_student",
                        column: x => x.student_id,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_feedback_subject",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id",
                        onDelete: ReferentialAction.Cascade);
                },
                comment: "Bảng lưu feedback của student và kết quả AI analysis")
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "grade",
                columns: table => new
                {
                    grade_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    subject_id = table.Column<int>(type: "int", nullable: false),
                    final_score = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true, comment: "Điểm tổng kết (tự động tính)"),
                    status = table.Column<string>(type: "enum('In Progress',' Passed','Failed')", nullable: true, defaultValueSql: "'In Progress'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.ComputedColumn)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.grade_id);
                    table.ForeignKey(
                        name: "fk_grade_student",
                        column: x => x.student_id,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_grade_subject",
                        column: x => x.subject_id,
                        principalTable: "subject",
                        principalColumn: "subject_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "attendance",
                columns: table => new
                {
                    attendance_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    status = table.Column<string>(type: "enum('Present','Absent','Not Yet')", nullable: true, defaultValueSql: "'Present'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    time_attendance = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    lesson_id = table.Column<int>(type: "int", nullable: false),
                    student_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.attendance_id);
                    table.ForeignKey(
                        name: "fk_attendance_lesson",
                        column: x => x.lesson_id,
                        principalTable: "lesson",
                        principalColumn: "lesson_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_attendance_student",
                        column: x => x.student_id,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "DailyFeedbacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    ClassId = table.Column<int>(type: "int", nullable: false),
                    SubjectId = table.Column<int>(type: "int", nullable: false),
                    FeedbackText = table.Column<string>(type: "longtext", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FeedbackTextTranscript = table.Column<string>(type: "longtext", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Sentiment = table.Column<string>(type: "longtext", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Urgency = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyFeedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyFeedbacks_class_ClassId",
                        column: x => x.ClassId,
                        principalTable: "class",
                        principalColumn: "class_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyFeedbacks_lesson_LessonId",
                        column: x => x.LessonId,
                        principalTable: "lesson",
                        principalColumn: "lesson_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyFeedbacks_student_StudentId",
                        column: x => x.StudentId,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyFeedbacks_subject_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "subject",
                        principalColumn: "subject_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "homework",
                columns: table => new
                {
                    homework_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    lesson_id = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_path = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    deadline = table.Column<DateTime>(type: "datetime", nullable: true),
                    created_by = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.homework_id);
                    table.ForeignKey(
                        name: "fk_homework_lesson",
                        column: x => x.lesson_id,
                        principalTable: "lesson",
                        principalColumn: "lesson_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "grade_type",
                columns: table => new
                {
                    grade_type_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    grade_id = table.Column<int>(type: "int", nullable: false),
                    subject_grade_type_id = table.Column<int>(type: "int", nullable: false),
                    score = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true, comment: "Điểm thực tế của sinh viên"),
                    comment = table.Column<string>(type: "text", nullable: true, comment: "Nhận xét của giảng viên", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    graded_by = table.Column<int>(type: "int", nullable: true, comment: "Lecturer ID đã chấm"),
                    graded_at = table.Column<DateTime>(type: "datetime", nullable: true),
                    status = table.Column<string>(type: "enum('Pending','Graded','Revised')", nullable: true, defaultValueSql: "'Pending'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.grade_type_id);
                    table.ForeignKey(
                        name: "fk_grade_type_grade",
                        column: x => x.grade_id,
                        principalTable: "grade",
                        principalColumn: "grade_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_grade_type_sgt",
                        column: x => x.subject_grade_type_id,
                        principalTable: "subject_grade_type",
                        principalColumn: "subject_grade_type_id");
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "homework_submission",
                columns: table => new
                {
                    homework_submission_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    comment = table.Column<string>(type: "text", nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "enum('Submitted','Graded','Late','Rejected')", nullable: true, defaultValueSql: "'Submitted'", collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_path = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true, collation: "utf8mb4_0900_ai_ci")
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    homework_id = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PRIMARY", x => x.homework_submission_id);
                    table.ForeignKey(
                        name: "fk_hws_homework",
                        column: x => x.homework_id,
                        principalTable: "homework",
                        principalColumn: "homework_id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_hws_student",
                        column: x => x.student_id,
                        principalTable: "student",
                        principalColumn: "student_id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4")
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "idx_att_lesson",
                table: "attendance",
                column: "lesson_id");

            migrationBuilder.CreateIndex(
                name: "idx_att_student",
                table: "attendance",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "fk_class_subject1_idx",
                table: "class",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "idx_class_level",
                table: "class",
                column: "level_id");

            migrationBuilder.CreateIndex(
                name: "idx_class_semester",
                table: "class",
                column: "semester_id");

            migrationBuilder.CreateIndex(
                name: "IX_DailyFeedbacks_ClassId",
                table: "DailyFeedbacks",
                column: "ClassId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyFeedbacks_LessonId",
                table: "DailyFeedbacks",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyFeedbacks_StudentId",
                table: "DailyFeedbacks",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyFeedbacks_SubjectId",
                table: "DailyFeedbacks",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "idx_enroll_class",
                table: "enrollment",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "idx_enroll_student",
                table: "enrollment",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "idx_fq_active",
                table: "feedback_questions",
                column: "is_active");

            migrationBuilder.CreateIndex(
                name: "idx_fq_order",
                table: "feedback_questions",
                column: "order_index");

            migrationBuilder.CreateIndex(
                name: "idx_fq_subject",
                table: "feedback_questions",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_class",
                table: "feedbacks",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_created",
                table: "feedbacks",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_sentiment",
                table: "feedbacks",
                column: "sentiment");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_status",
                table: "feedbacks",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_student",
                table: "feedbacks",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_subject",
                table: "feedbacks",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "idx_feedback_urgency",
                table: "feedbacks",
                column: "urgency");

            migrationBuilder.CreateIndex(
                name: "idx_feedbacks_issue_category",
                table: "feedbacks",
                column: "issue_category");

            migrationBuilder.CreateIndex(
                name: "uk_feedback_student_class",
                table: "feedbacks",
                columns: new[] { "student_id", "class_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_grade_student",
                table: "grade",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "idx_grade_subject",
                table: "grade",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "uk_student_subject",
                table: "grade",
                columns: new[] { "student_id", "subject_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_gt_grade",
                table: "grade_type",
                column: "grade_id");

            migrationBuilder.CreateIndex(
                name: "idx_gt_grader",
                table: "grade_type",
                column: "graded_by");

            migrationBuilder.CreateIndex(
                name: "idx_gt_sgt",
                table: "grade_type",
                column: "subject_grade_type_id");

            migrationBuilder.CreateIndex(
                name: "uk_grade_detail",
                table: "grade_type",
                columns: new[] { "grade_id", "subject_grade_type_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_holiday_date",
                table: "holiday",
                column: "holidayDate");

            migrationBuilder.CreateIndex(
                name: "idx_holiday_semester",
                table: "holiday",
                column: "semesterId");

            migrationBuilder.CreateIndex(
                name: "idx_holiday_semester_date",
                table: "holiday",
                columns: new[] { "semesterId", "holidayDate" });

            migrationBuilder.CreateIndex(
                name: "idx_homework_lesson",
                table: "homework",
                column: "lesson_id");

            migrationBuilder.CreateIndex(
                name: "idx_hws_homework",
                table: "homework_submission",
                column: "homework_id");

            migrationBuilder.CreateIndex(
                name: "idx_hws_student",
                table: "homework_submission",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "idx_lecture_user",
                table: "lecture",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "idx_lesson_class",
                table: "lesson",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "idx_lesson_lecture",
                table: "lesson",
                column: "lecture_id");

            migrationBuilder.CreateIndex(
                name: "idx_lesson_room",
                table: "lesson",
                column: "room_id");

            migrationBuilder.CreateIndex(
                name: "idx_lesson_time",
                table: "lesson",
                column: "time_id");

            migrationBuilder.CreateIndex(
                name: "uk_level_name",
                table: "level",
                column: "level_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_material_created_by",
                table: "material",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "fk_material_updated_by",
                table: "material",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "idx_material_created_at",
                table: "material",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "idx_material_status",
                table: "material",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "idx_material_subject",
                table: "material",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "fk_news_approved_by",
                table: "news",
                column: "approved_by");

            migrationBuilder.CreateIndex(
                name: "fk_news_created_by",
                table: "news",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "fk_news_updated_by",
                table: "news",
                column: "updated_by");

            migrationBuilder.CreateIndex(
                name: "idx_notif_user",
                table: "notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "uk_role_name",
                table: "role",
                column: "role_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_room_name",
                table: "room",
                column: "room_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_student_level",
                table: "student",
                column: "level_id");

            migrationBuilder.CreateIndex(
                name: "idx_student_semester",
                table: "student",
                column: "semester_id");

            migrationBuilder.CreateIndex(
                name: "idx_student_user",
                table: "student",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "uk_student_code",
                table: "student",
                column: "student_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_subject_level",
                table: "subject",
                column: "level_id");

            migrationBuilder.CreateIndex(
                name: "uk_subject_code",
                table: "subject",
                column: "subject_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_sgt_subject",
                table: "subject_grade_type",
                column: "subject_id");

            migrationBuilder.CreateIndex(
                name: "uk_subject_grade_type",
                table: "subject_grade_type",
                columns: new[] { "subject_id", "grade_type_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "fk_user_department1_idx",
                table: "user",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "idx_user_role",
                table: "user",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "uk_user_email",
                table: "user",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "uk_user_phone",
                table: "user",
                column: "phone_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance");

            migrationBuilder.DropTable(
                name: "DailyFeedbacks");

            migrationBuilder.DropTable(
                name: "enrollment");

            migrationBuilder.DropTable(
                name: "feedback_questions");

            migrationBuilder.DropTable(
                name: "feedbacks");

            migrationBuilder.DropTable(
                name: "grade_type");

            migrationBuilder.DropTable(
                name: "holiday");

            migrationBuilder.DropTable(
                name: "homework_submission");

            migrationBuilder.DropTable(
                name: "material");

            migrationBuilder.DropTable(
                name: "news");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "grade");

            migrationBuilder.DropTable(
                name: "subject_grade_type");

            migrationBuilder.DropTable(
                name: "homework");

            migrationBuilder.DropTable(
                name: "student");

            migrationBuilder.DropTable(
                name: "lesson");

            migrationBuilder.DropTable(
                name: "class");

            migrationBuilder.DropTable(
                name: "lecture");

            migrationBuilder.DropTable(
                name: "room");

            migrationBuilder.DropTable(
                name: "timeslot");

            migrationBuilder.DropTable(
                name: "semester");

            migrationBuilder.DropTable(
                name: "subject");

            migrationBuilder.DropTable(
                name: "user");

            migrationBuilder.DropTable(
                name: "level");

            migrationBuilder.DropTable(
                name: "department");

            migrationBuilder.DropTable(
                name: "role");
        }
    }
}
