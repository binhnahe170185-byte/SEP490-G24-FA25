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

  // Lấy danh sách tất cả subjects (từ manager endpoint)
  static async getAllSubjectOptions() {
    const response = await api.get("/api/manager/subjects/dropdown");
    return response.data?.data || response.data;
  }

  // Lấy danh sách subjects cho staffAcademic (getAllSubject endpoint)
  static async getAllSubjectForStaffAcademic() {
    try {
      console.log('SubjectList.getAllSubjectForStaffAcademic - Calling API...');
      const response = await api.get("/api/staffAcademic/classes/subjects/getAllSubject");
      console.log('SubjectList.getAllSubjectForStaffAcademic - Raw response:', response);
      console.log('SubjectList.getAllSubjectForStaffAcademic - Response data:', response.data);

      // Handle response format: { code: 200, data: [...] }
      if (response.data?.data && Array.isArray(response.data.data)) {
        console.log('SubjectList.getAllSubjectForStaffAcademic - Returning data array:', response.data.data.length, 'items');
        return response.data.data;
      }
      // Fallback: try direct data
      if (Array.isArray(response.data)) {
        console.log('SubjectList.getAllSubjectForStaffAcademic - Returning direct array:', response.data.length, 'items');
        return response.data;
      }
      // If response format is unexpected, try to extract from nested structure
      console.warn('SubjectList.getAllSubjectForStaffAcademic - Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('SubjectList.getAllSubjectForStaffAcademic - Error:', error);
      console.error('SubjectList.getAllSubjectForStaffAcademic - Error response:', error.response);
      // Fallback to manager endpoint if staffAcademic fails
      console.log('SubjectList.getAllSubjectForStaffAcademic - Falling back to manager endpoint...');
      try {
        const fallbackResponse = await api.get("/api/manager/subjects/dropdown");
        if (fallbackResponse.data?.data && Array.isArray(fallbackResponse.data.data)) {
          console.log('SubjectList.getAllSubjectForStaffAcademic - Fallback successful:', fallbackResponse.data.data.length, 'items');
          return fallbackResponse.data.data;
        }
        if (Array.isArray(fallbackResponse.data)) {
          return fallbackResponse.data;
        }
      } catch (fallbackError) {
        console.error('SubjectList.getAllSubjectForStaffAcademic - Fallback also failed:', fallbackError);
      }
      throw error;
    }
  }
}

export default SubjectList;