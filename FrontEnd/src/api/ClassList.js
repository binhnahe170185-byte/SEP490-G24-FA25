import { api } from "./http";

class ClassList {
  // Lấy tất cả class
  static async getAll() {
    const response = await api.get("/api/manager/classes");
    return response.data?.data ?? response.data; // hỗ trợ cả 2 kiểu payload
  }

  // Lấy chi tiết class theo id
  static async getDetail(classId) {
    const response = await api.get(`/api/manager/classes`);
    return response.data?.data ?? response.data;
  }

  // Update status class
  static async updateStatus(classId, status) {
    const response = await api.patch(`/api/manager/classes/${classId}/status`, {
      status,
    });
    return response.data;
  }
}

export default ClassList;
