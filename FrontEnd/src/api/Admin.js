// src/api/Admin.js
import { api } from "./http";

// Lọc param rác
const clean = (o = {}) =>
  Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

// Chuẩn hoá body về mảng users
const extractUsersArray = (body) => {
  if (Array.isArray(body)) return body;                 // [ ... ]
  if (Array.isArray(body?.data)) return body.data;      // { data: [ ... ] }
  if (Array.isArray(body?.result)) return body.result;  // { result: [ ... ] }
  if (Array.isArray(body?.items)) return body.items;    // { items: [ ... ] }
  if (Array.isArray(body?.data?.items)) return body.data.items; // { data: { items: [...] } }
  return []; // không khớp -> trả mảng rỗng
};

const AdminApi = {
  // -> TRẢ VỀ MẢNG USERS
  getUsers: (params = {}) =>
    api.get("/api/Admin/users", { params: clean(params) }).then((res) => {
      const body = res?.data !== undefined ? res.data : res;
      const list = extractUsersArray(body);
      // debug khi rỗng
      if (!Array.isArray(list) || list.length === 0) {
        // eslint-disable-next-line no-console
        console.warn("[AdminApi.getUsers] Empty list. Body =", body);
      }
      return list;
    }),

  getUserById: (id) => api.get(`/api/Admin/users/${id}`),
  createUser: (payload) => api.post("/api/Admin/users", payload),
  updateUser: (id, payload) => api.put(`/api/Admin/users/${id}`, payload),
  deleteUser: (id) => api.delete(`/api/Admin/users/${id}`),

  setUserStatus: (id, isActive) =>
    api.patch(`/api/Admin/users/${id}/status`, { isActive }),

  importUsers: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/Admin/users/import", form); // để axios tự set boundary
  },
};

export default AdminApi;
