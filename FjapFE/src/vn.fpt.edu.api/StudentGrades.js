// import { api } from "./http";

// class StudentGrades {
//   // Lấy danh sách học kỳ của sinh viên
//   static async getSemesters(studentId) {
//     const response = await api.get(`/api/students/${studentId}/semesters`);
//     return response.data?.data || response.data;
//   }

//   // Lấy danh sách môn học theo học kỳ
//   static async getCourses(studentId, semesterId) {
//     const response = await api.get(
//       `/api/students/${studentId}/semesters/${semesterId}/courses`
//     );
//     return response.data?.data || response.data;
//   }

//   // Lấy chi tiết điểm của một môn học
//   static async getGradeDetails(studentId, courseId) {
//     const response = await api.get(
//       `/api/students/${studentId}/courses/${courseId}`
//     );
//     return response.data?.data || response.data;
//   }

//   // Lấy toàn bộ bảng điểm của sinh viên
//   static async getAllGrades(studentId) {
//     const response = await api.get(`/api/students/${studentId}/grades`);
//     return response.data?.data || response.data;
//   }

//   // Lấy GPA theo học kỳ
//   static async getGPA(studentId, semesterId) {
//     const response = await api.get(
//       `/api/students/${studentId}/semesters/${semesterId}/gpa`
//     );
//     return response.data?.data || response.data;
//   }

//   // Lấy thống kê điểm
//   static async getStatistics(studentId) {
//     const response = await api.get(`/api/students/${studentId}/statistics`);
//     return response.data?.data || response.data;
//   }
// }

// export default StudentGrades;


// import { api } from "./http";

// Mock data
const mockSemesters = [
  { semesterId: 1, year: 2024, season: "Spring" },
  { semesterId: 2, year: 2024, season: "Summer" },
  { semesterId: 3, year: 2024, season: "Fall" },
];

const mockCourses = {
  1: [ // Spring 2024
    {
      courseId: 101,
      subjectCode: "CS101",
      subjectName: "Introduction to Programming",
      className: "Class A",
      classCode: "A01",
      average: 8.5,
      status: "Showing",
      gradeStatus: "Passed",
      startDate: "2024-01-15",
      endDate: "2024-05-15",
    },
    {
      courseId: 102,
      subjectCode: "MATH201",
      subjectName: "Calculus I",
      className: "Class B",
      classCode: "B02",
      average: 7.8,
      status: "Showing",
      gradeStatus: "Passed",
      startDate: "2024-01-15",
      endDate: "2024-05-15",
    },
  ],
  2: [ // Summer 2024
    {
      courseId: 201,
      subjectCode: "CS102",
      subjectName: "Data Structures",
      className: "Class A",
      classCode: "A01",
      average: 9.0,
      status: "Showing",
      gradeStatus: "Passed",
      startDate: "2024-06-01",
      endDate: "2024-08-15",
    },
  ],
  3: [ // Fall 2024
    {
      courseId: 301,
      subjectCode: "CS201",
      subjectName: "Database Management",
      className: "Class C",
      classCode: "C03",
      average: 8.2,
      status: "Showing",
      gradeStatus: "Passed",
      startDate: "2024-09-01",
      endDate: "2024-12-15",
    },
    {
      courseId: 302,
      subjectCode: "WEB301",
      subjectName: "Web Development",
      className: "Class A",
      classCode: "A01",
      average: 6.5,
      status: "Showing",
      gradeStatus: "Failed",
      startDate: "2024-09-01",
      endDate: "2024-12-15",
    },
  ],
};

const mockGradeDetails = {
  101: {
    subjectCode: "CS101",
    subjectName: "Introduction to Programming",
    average: 8.5,
    status: "Passed",
    participation: {
      componentName: "Class Participation",
      weight: 10,
      value: 9.0,
      comment: "Good participation",
    },
    assignment: {
      componentName: "Homework & Labs",
      weight: 20,
      value: 8.5,
      comment: "Well done",
    },
    progressTests: [
      {
        componentName: "Midterm Test 1",
        weight: 15,
        value: 8.0,
        comment: "Good progress",
      },
      {
        componentName: "Midterm Test 2",
        weight: 15,
        value: 8.5,
        comment: "Excellent",
      },
    ],
    finalExam: {
      componentName: "Final Exam",
      weight: 40,
      value: 8.5,
      comment: "Great performance",
    },
  },
  102: {
    subjectCode: "MATH201",
    subjectName: "Calculus I",
    average: 7.8,
    status: "Passed",
    participation: {
      componentName: "Class Participation",
      weight: 10,
      value: 8.0,
      comment: "",
    },
    assignment: {
      componentName: "Problem Sets",
      weight: 20,
      value: 7.5,
      comment: "",
    },
    progressTests: [
      {
        componentName: "Quiz 1",
        weight: 10,
        value: 7.0,
        comment: "",
      },
      {
        componentName: "Quiz 2",
        weight: 10,
        value: 8.0,
        comment: "",
      },
    ],
    finalExam: {
      componentName: "Final Exam",
      weight: 50,
      value: 8.0,
      comment: "",
    },
  },
  201: {
    subjectCode: "CS102",
    subjectName: "Data Structures",
    average: 9.0,
    status: "Passed",
    participation: {
      componentName: "Class Participation",
      weight: 10,
      value: 9.5,
      comment: "Outstanding",
    },
    assignment: {
      componentName: "Programming Assignments",
      weight: 30,
      value: 9.0,
      comment: "Excellent work",
    },
    progressTests: [
      {
        componentName: "Midterm",
        weight: 20,
        value: 8.5,
        comment: "",
      },
    ],
    finalExam: {
      componentName: "Final Exam",
      weight: 40,
      value: 9.0,
      comment: "",
    },
  },
  301: {
    subjectCode: "CS201",
    subjectName: "Database Management",
    average: 8.2,
    status: "Passed",
    participation: {
      componentName: "Class Participation",
      weight: 10,
      value: 8.5,
      comment: "",
    },
    assignment: {
      componentName: "Database Projects",
      weight: 25,
      value: 8.0,
      comment: "",
    },
    progressTests: [
      {
        componentName: "Midterm Test",
        weight: 20,
        value: 8.0,
        comment: "",
      },
    ],
    finalExam: {
      componentName: "Final Exam",
      weight: 45,
      value: 8.5,
      comment: "",
    },
  },
  302: {
    subjectCode: "WEB301",
    subjectName: "Web Development",
    average: 6.5,
    status: "Failed",
    participation: {
      componentName: "Class Participation",
      weight: 10,
      value: 7.0,
      comment: "",
    },
    assignment: {
      componentName: "Web Projects",
      weight: 30,
      value: 6.5,
      comment: "Need improvement",
    },
    progressTests: [
      {
        componentName: "Midterm",
        weight: 20,
        value: 6.0,
        comment: "",
      },
    ],
    finalExam: {
      componentName: "Final Exam",
      weight: 40,
      value: 6.5,
      comment: "",
    },
    finalExamResit: {
      componentName: "Final Exam Resit",
      weight: 40,
      value: 7.5,
      comment: "Better performance",
    },
  },
};

class StudentGrades {
  // Lấy danh sách học kỳ của sinh viên
  static async getSemesters(studentId) {
    // const response = await api.get(`/api/students/${studentId}/semesters`);
    // return response.data?.data || response.data;
    
    // Mock delay to simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockSemesters);
      }, 300);
    });
  }

  // Lấy danh sách môn học theo học kỳ
  static async getCourses(studentId, semesterId) {
    // const response = await api.get(
    //   `/api/students/${studentId}/semesters/${semesterId}/courses`
    // );
    // return response.data?.data || response.data;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockCourses[semesterId] || []);
      }, 500);
    });
  }

  // Lấy chi tiết điểm của một môn học
  static async getGradeDetails(studentId, courseId) {
    // const response = await api.get(
    //   `/api/students/${studentId}/courses/${courseId}`
    // );
    // return response.data?.data || response.data;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockGradeDetails[courseId] || null);
      }, 500);
    });
  }

  // Lấy toàn bộ bảng điểm của sinh viên
  static async getAllGrades(studentId) {
    // const response = await api.get(`/api/students/${studentId}/grades`);
    // return response.data?.data || response.data;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ semesters: mockSemesters, courses: mockCourses });
      }, 500);
    });
  }

  // Lấy GPA theo học kỳ
  static async getGPA(studentId, semesterId) {
    // const response = await api.get(
    //   `/api/students/${studentId}/semesters/${semesterId}/gpa`
    // );
    // return response.data?.data || response.data;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const courses = mockCourses[semesterId] || [];
        const totalAverage = courses.reduce((sum, c) => sum + c.average, 0) / courses.length;
        resolve({ gpa: totalAverage.toFixed(2) });
      }, 500);
    });
  }

  // Lấy thống kê điểm
  static async getStatistics(studentId) {
    // const response = await api.get(`/api/students/${studentId}/statistics`);
    // return response.data?.data || response.data;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalCourses: 5,
          passedCourses: 4,
          failedCourses: 1,
          averageGPA: 8.0,
        });
      }, 500);
    });
  }
}

export default StudentGrades;