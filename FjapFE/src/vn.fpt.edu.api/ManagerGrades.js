// Mock API cho Manager Grades
// Trong production, thay bằng API calls thật

const ManagerGrades = {
  // Lấy danh sách tất cả courses cần chấm điểm
  getCourses: async (managerId) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        courseId: "C001",
        semester: "Summer 2025",
        courseCode: "HCM202",
        courseName: "Ho Chi Minh Ideology",
        className: "MKT1718-DIG",
        classCode: "MKT1718-DIG",
        startDate: "12/05/2025",
        endDate: "12/06/2025",
        students: 25,
        completionStatus: "100% Complete",
        completionPercent: 100,
        average: 8.7,
        passed: 23,
        failed: 0,
        incomplete: 2,
        gradingProgress: 25,
        gradingTotal: 25,
        gradingPercent: 100,
        level: "Undergraduate",
        status: "Active"
      },
      {
        courseId: "C002",
        semester: "Summer 2025",
        courseCode: "PRJ301",
        courseName: "Java Web Application Development",
        className: "SE1702",
        classCode: "SE1702",
        startDate: "12/05/2025",
        endDate: "15/07/2025",
        students: 35,
        completionStatus: "75% Complete",
        completionPercent: 75,
        average: 7.2,
        passed: 20,
        failed: 2,
        incomplete: 13,
        gradingProgress: 18,
        gradingTotal: 35,
        gradingPercent: 51,
        level: "Undergraduate",
        status: "Active"
      },
      {
        courseId: "C003",
        semester: "Summer 2025",
        courseCode: "SWP391",
        courseName: "Software Engineering Project",
        className: "SE1703",
        classCode: "SE1703",
        startDate: "12/05/2025",
        endDate: "20/07/2025",
        students: 30,
        completionStatus: "30% Complete",
        completionPercent: 30,
        average: 6.5,
        passed: 8,
        failed: 1,
        incomplete: 21,
        gradingProgress: 9,
        gradingTotal: 30,
        gradingPercent: 30,
        level: "Undergraduate",
        status: "Active"
      },
      {
        courseId: "C004",
        semester: "Spring 2025",
        courseCode: "MKT205",
        courseName: "Digital Marketing",
        className: "MKT1801",
        classCode: "MKT1801",
        startDate: "01/03/2025",
        endDate: "30/04/2025",
        students: 28,
        completionStatus: "100% Complete",
        completionPercent: 100,
        average: 8.1,
        passed: 27,
        failed: 1,
        incomplete: 0,
        gradingProgress: 28,
        gradingTotal: 28,
        gradingPercent: 100,
        level: "Undergraduate",
        status: "Completed"
      },
      {
        courseId: "C005",
        semester: "Summer 2025",
        courseCode: "IOT102",
        courseName: "Internet of Things",
        className: "AI1601",
        classCode: "AI1601",
        startDate: "15/05/2025",
        endDate: "20/07/2025",
        students: 32,
        completionStatus: "50% Complete",
        completionPercent: 50,
        average: 7.8,
        passed: 15,
        failed: 1,
        incomplete: 16,
        gradingProgress: 16,
        gradingTotal: 32,
        gradingPercent: 50,
        level: "Undergraduate",
        status: "Active"
      },
      {
        courseId: "C006",
        semester: "Fall 2024",
        courseCode: "DBI202",
        courseName: "Database Systems",
        className: "SE1704",
        classCode: "SE1704",
        startDate: "01/09/2024",
        endDate: "15/12/2024",
        students: 40,
        completionStatus: "100% Complete",
        completionPercent: 100,
        average: 7.5,
        passed: 35,
        failed: 3,
        incomplete: 2,
        gradingProgress: 40,
        gradingTotal: 40,
        gradingPercent: 100,
        level: "Undergraduate",
        status: "Completed"
      }
    ];
  },

  // Lấy chi tiết course và danh sách sinh viên
  getCourseDetails: async (managerId, courseId) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      courseId: courseId,
      courseCode: "PRJ301",
      courseName: "Java Web Application Development",
      className: "SE1702",
      semester: "Summer 2025",
      students: [
        {
          studentId: "SE160001",
          studentName: "Nguyen Van A",
          email: "anv@fpt.edu.vn",
          participation: 8.5,
          assignment: 7.0,
          progressTest1: 8.0,
          progressTest2: 7.5,
          finalExam: 8.0,
          average: 7.8,
          status: "Passed"
        },
        {
          studentId: "SE160002",
          studentName: "Tran Thi B",
          email: "btt@fpt.edu.vn",
          participation: 9.0,
          assignment: 8.5,
          progressTest1: 9.0,
          progressTest2: 8.0,
          finalExam: 8.5,
          average: 8.6,
          status: "Passed"
        }
      ]
    };
  },

  // Nhập/cập nhật điểm cho sinh viên
  updateStudentGrade: async (managerId, courseId, studentId, gradeData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("Updating grade:", { managerId, courseId, studentId, gradeData });
    return {
      success: true,
      message: "Grade updated successfully"
    };
  },

  // Export điểm của một course
  exportCourseGrades: async (managerId, courseId) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Exporting grades for course:", courseId);
    // Trong thực tế sẽ tạo và download file Excel/PDF
    return {
      success: true,
      fileUrl: "/downloads/grades_export.xlsx"
    };
  },

  // Export điểm tất cả courses
  exportAllGrades: async (managerId) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log("Exporting all grades for manager:", managerId);
    return {
      success: true,
      fileUrl: "/downloads/all_grades_export.xlsx"
    };
  }
};

export default ManagerGrades;