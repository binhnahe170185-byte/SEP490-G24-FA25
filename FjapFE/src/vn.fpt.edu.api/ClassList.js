import { api } from "./http";

class ClassList {
  // Lấy tất cả class
  static async getAll() {
    const response = await api.get("/api/manager/classes");
    return response.data?.data ?? response.data; // hỗ trợ cả 2 kiểu payload
  }

  static async getById(classId) {
    const response = await api.get(`/api/manager/classes/${classId}`);
    return response.data?.data ?? response.data;
  }

  // Lấy chi tiết class theo id
  static async getDetail(classId) {
    const response = await api.get(`/api/manager/classes/${classId}/subjects`);
    return response.data?.data ?? response.data;
  }

  static async getFormOptions() {
    const response = await api.get("/api/manager/classes/options");
    return response.data?.data ?? response.data;
  }

  static async create(payload) {
    const response = await api.post("/api/manager/classes", payload);
    return response.data?.data ?? response.data;
  }

  static async update(classId, payload) {
    const response = await api.put(`/api/manager/classes/${classId}`, payload);
    return response.data?.data ?? response.data;
  }

  // Update status class
  static async updateStatus(classId, status) {
    const response = await api.patch(`/api/manager/classes/${classId}/status`, {
      status,
    });
    return response.data?.data ?? response.data;
  }
}

export default ClassList;
