// src/api/Admin.js
import { api } from "./http";

const AdminApi = {
  // GET /api/Admin/users?search=&role=&status=&page=&pageSize=
  getUsers: (params) => api.get("/api/Admin/users", { params }),

  getUserById: (id) => api.get(`/api/Admin/users/${id}`),
  createUser: (payload) => api.post("/api/Admin/users", payload),
  updateUser: (id, payload) => api.put(`/api/Admin/users/${id}`, payload),
  deleteUser: (id) => api.delete(`/api/Admin/users/${id}`),

  setUserStatus: (id, isActive) =>
    api.patch(`/api/Admin/users/${id}/status`, { isActive }),

  importUsers: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/Admin/users/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default AdminApi;
