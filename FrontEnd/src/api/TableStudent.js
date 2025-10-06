import { api, setAuthToken } from "./http";

class TableStudent {
  static async getAll() {
    const response = await http.get("api/students");
    return response.data.data;
  }
}

export default TableStudent;
