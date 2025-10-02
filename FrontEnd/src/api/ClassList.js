import http from "./http";

class ClassList {
  static async getAll() {
    const response = await http.get("api/manager/classes");
    return response.data.data;
  }
}

export default ClassList;
