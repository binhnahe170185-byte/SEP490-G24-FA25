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

  // Lấy danh sách subjects cho dropdown (từ manager endpoint)
  static async getDropdownOptions() {
    const response = await api.get("/api/manager/subjects/dropdown");
    return response.data?.data || response.data;
  }

  // Lấy danh sách subjects cho dropdown (từ staffAcademic endpoint)
  static async getDropdownOptionsForStaffAcademic() {
    try {
      console.log('SubjectList.getDropdownOptionsForStaffAcademic - Calling API...');
      const response = await api.get("/api/staffAcademic/classes/subjects/dropdown");
      console.log('SubjectList.getDropdownOptionsForStaffAcademic - Raw response:', response);
      console.log('SubjectList.getDropdownOptionsForStaffAcademic - Response data:', response.data);
      
      // Handle response format: { code: 200, data: [...] }
      if (response.data?.data && Array.isArray(response.data.data)) {
        console.log('SubjectList.getDropdownOptionsForStaffAcademic - Returning data array:', response.data.data.length, 'items');
        return response.data.data;
      }
      // Fallback: try direct data
      if (Array.isArray(response.data)) {
        console.log('SubjectList.getDropdownOptionsForStaffAcademic - Returning direct array:', response.data.length, 'items');
        return response.data;
      }
      // If response format is unexpected, try to extract from nested structure
      console.warn('SubjectList.getDropdownOptionsForStaffAcademic - Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('SubjectList.getDropdownOptionsForStaffAcademic - Error:', error);
      console.error('SubjectList.getDropdownOptionsForStaffAcademic - Error response:', error.response);
      // Fallback to manager endpoint if staffAcademic fails
      console.log('SubjectList.getDropdownOptionsForStaffAcademic - Falling back to manager endpoint...');
      try {
        const fallbackResponse = await api.get("/api/manager/subjects/dropdown");
        if (fallbackResponse.data?.data && Array.isArray(fallbackResponse.data.data)) {
          console.log('SubjectList.getDropdownOptionsForStaffAcademic - Fallback successful:', fallbackResponse.data.data.length, 'items');
          return fallbackResponse.data.data;
        }
        if (Array.isArray(fallbackResponse.data)) {
          return fallbackResponse.data;
        }
      } catch (fallbackError) {
        console.error('SubjectList.getDropdownOptionsForStaffAcademic - Fallback also failed:', fallbackError);
      }
      throw error;
    }
  }
}

export default SubjectList;