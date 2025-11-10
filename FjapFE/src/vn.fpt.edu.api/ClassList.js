import { api } from "./http";

class ClassList {
  // Lấy tất cả class
  static async getAll() {
    const response = await api.get("/api/staffAcademic/classes");
    return response.data?.data ?? response.data; // hỗ trợ cả 2 kiểu payload
  }

  static async getById(classId) {
    const response = await api.get(`/api/staffAcademic/classes/${classId}`);
    return response.data?.data ?? response.data;
  }

  // Lấy chi tiết class theo id
  static async getDetail(classId) {
    const response = await api.get(`/api/staffAcademic/classes/${classId}/subjects`);
    return response.data?.data ?? response.data;
  }

  static async getStudents(classId) {
    const response = await api.get(`/api/staffAcademic/classes/${classId}/students`);
    return response.data?.data ?? response.data;
  }

  static async getEligibleStudents(classId) {
    const response = await api.get(`/api/staffAcademic/classes/${classId}/eligible-students`);
    return response.data?.data ?? response.data;
  }

  static async addStudents(classId, studentIds) {
    const response = await api.post(`/api/staffAcademic/classes/${classId}/students`, {
      studentIds,
    });
    return response.data ?? response;
  }

  static async getFormOptions() {
    const response = await api.get("/api/staffAcademic/classes/options");
    return response.data?.data ?? response.data;
  }

  static async create(payload) {
    const response = await api.post("/api/staffAcademic/classes", payload);
    return response.data?.data ?? response.data;
  }

  static async update(classId, payload) {
    const response = await api.put(`/api/staffAcademic/classes/${classId}`, payload);
    return response.data?.data ?? response.data;
  }

  // POST /api/staffAcademic/classes/schedule - Create schedule from patterns
  static async createSchedule(payload) {
    console.log('ClassList.createSchedule - Request payload:', payload);
    try {
      const response = await api.post("/api/staffAcademic/classes/schedule", payload);
      console.log('ClassList.createSchedule - Raw response:', response);
      console.log('ClassList.createSchedule - Response data:', response.data);
      
      // Handle different response formats
      if (response.data?.data) {
        return response.data.data;
      }
      if (response.data) {
        return response.data;
      }
      return response;
    } catch (error) {
      console.error('ClassList.createSchedule - Error:', error);
      console.error('ClassList.createSchedule - Error response:', error.response);
      console.error('ClassList.createSchedule - Error data:', error.response?.data);
      throw error;
    }
  }

  // GET /api/staffAcademic/classes/schedule - Get class schedule
  static async getSchedule(semesterId, classId) {
    const response = await api.get("/api/staffAcademic/classes/schedule", {
      params: { semesterId, classId }
    });
    return response.data?.data ?? response.data;
  }

  static async delete(classId) {
    const response = await api.delete(`/api/staffAcademic/classes/${classId}`);
    return response.data?.data ?? response.data;
  }

  // Update status class
  static async updateStatus(classId, status) {
    const response = await api.patch(`/api/staffAcademic/classes/${classId}/status`, {
      status,
    });
    return response.data?.data ?? response.data;
  }
}

export default ClassList;
