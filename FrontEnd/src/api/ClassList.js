import http from "./http";

class ClassList {
  static async getAll() {
    const response = await http.get("api/manager/classes");
    return response.data.data;
  }

  static async getDetail(classId) {
    const response = await http.get(`api/manager/classes/${classId}`);
    return response.data.data;
  }

  static async updateStatus(classId, status) {
    const response = await http.patch(`api/manager/classes/${classId}/status`, {
      status,
    });
    return response.data;
  }
}

export default ClassList;
