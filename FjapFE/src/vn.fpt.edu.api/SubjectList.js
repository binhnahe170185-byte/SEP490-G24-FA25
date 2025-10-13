import { api } from "../vn.fpt.edu.api/http";

class SubjectList {
  // Lấy tất cả subjects
  static async getAll() {
    const response = await api.get("/api/manager/subjects");
    return response.data?.data || response.data;
  }

  // Lấy subject theo ID
  static async getById(subjectId) {
    const response = await api.get(`/api/manager/subjects/${subjectId}`);
    return response.data?.data || response.data;
  }

  // Tạo subject mới
  static async create(subjectData) {
    const response = await api.post("/api/manager/subjects", subjectData);
    return response.data?.data || response.data;
  }

  // Cập nhật subject
  static async update(subjectId, subjectData) {
    const response = await api.put(
      `/api/manager/subjects/${subjectId}`,
      subjectData
    );
    return response.data;
  }

  // Xóa subject
  static async delete(subjectId) {
    const response = await api.delete(`/api/manager/subjects/${subjectId}`);
    return response.data;
  }

  // Cập nhật trạng thái subject
  static async updateStatus(subjectId, status) {
    const response = await api.patch(
      `/api/manager/subjects/${subjectId}/status`,
      { status }
    );
    return response.data;
  }

  static async getFormOptions() {
    const response = await api.get("/api/manager/subjects/options");
    return response.data?.data || response.data;
  }
}

export default SubjectList;