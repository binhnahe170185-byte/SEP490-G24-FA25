import { api } from "./http";

const AttendanceApi = {
  // Lấy danh sách tất cả lớp học
  getClasses: async () => {
    try {
      const response = await api.get("/api/attendance/classes");
      console.log("API Response:", response.data);
      return response.data?.data || [];
    } catch (error) {
      console.error("API Error:", error);
      console.error("Error Response:", error.response?.data);
      throw error;
    }
  },

  // Lấy danh sách lessons của một lớp
  getLessonsByClass: async (classId) => {
    const response = await api.get(`/api/attendance/classes/${classId}/lessons`);
    return response.data?.data || [];
  },

  // Lấy danh sách sinh viên và attendance của một lesson
  getStudentsByLesson: async (lessonId) => {
    const response = await api.get(`/api/attendance/lessons/${lessonId}/students`);
    return response.data?.data || null;
  },

  // Cập nhật attendance cho một sinh viên
  updateAttendance: async (lessonId, studentId, status) => {
    const response = await api.post("/api/attendance", {
      lessonId,
      studentId,
      status,
    });
    return response.data?.data || null;
  },

  // Cập nhật nhiều attendance cùng lúc
  updateBulkAttendance: async (lessonId, attendances) => {
    const response = await api.post("/api/attendance/bulk", {
      lessonId,
      attendances,
    });
    return response.data?.data || [];
  },
};

export default AttendanceApi;

