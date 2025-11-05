import { api } from "./http";

class StudentGrades {
  // Lấy danh sách học kỳ của sinh viên
  static async getSemesters(studentId) {
    const response = await api.get(`/api/Students/${studentId}/semesters`);
    return response.data?.data || response.data;
  }

  // Lấy danh sách môn học theo học kỳ
  static async getCourses(studentId, semesterId) {
    const response = await api.get(
      `/api/Students/${studentId}/semesters/${semesterId}/courses`
    );
    return response.data?.data || response.data;
  }

  // Lấy chi tiết điểm của một môn học
  static async getGradeDetails(studentId, classId) {
    const response = await api.get(
      `/api/Students/${studentId}/courses/${classId}`
    );
    return response.data?.data || response.data;
  }

  // Lấy toàn bộ bảng điểm của sinh viên
  static async getAllGrades(studentId) {
    const semesters = await this.getSemesters(studentId);
    const courses = {};
    for (const semester of semesters) {
      courses[semester.semesterId] = await this.getCourses(studentId, semester.semesterId);
    }
    return { semesters, courses };
  }

  // Lấy GPA theo học kỳ
  static async getGPA(studentId, semesterId) {
    const response = await api.get(
      `/api/Students/${studentId}/semesters/${semesterId}/gpa`
    );
    return response.data?.data || response.data;
  }

  // Lấy thống kê điểm
  static async getStatistics(studentId) {
    return {
      totalCourses: 5,
      passedCourses: 4,
      failedCourses: 1,
      averageGPA: 8.0,
    };
  }

  // Lấy danh sách tất cả môn học active trong curriculum 
  static async getCurriculumSubjects(search = "", page = 1, pageSize = 20) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("pageSize", pageSize.toString());
    
    const response = await api.get(`/api/Students/curriculum-subjects?${params.toString()}`);
    return {
      items: response.data?.data || response.data || [],
      total: response.data?.total || 0,
      page: response.data?.page || page,
      pageSize: response.data?.pageSize || pageSize
    };
  }
}

export default StudentGrades;
