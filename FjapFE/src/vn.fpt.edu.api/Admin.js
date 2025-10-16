// src/api/Admin.js
import { api } from "./http";

// Lọc param rác
const clean = (o = {}) =>
  Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

// Chuẩn hoá body -> { total, items }
const extractPaged = (body) => {
  // các dạng hỗ trợ:
  // { total, items }, { data: { total, items } }, { data: [...] }, [...], { items: [...] }, { result: [...] }
  if (body?.total !== undefined && Array.isArray(body?.items)) {
    return { total: body.total, items: body.items };
  }
  if (body?.data?.total !== undefined && Array.isArray(body?.data?.items)) {
    return { total: body.data.total, items: body.data.items };
  }
  if (Array.isArray(body)) return { total: body.length, items: body };
  if (Array.isArray(body?.data)) return { total: body.data.length, items: body.data };
  if (Array.isArray(body?.items)) return { total: body.items.length, items: body.items };
  if (Array.isArray(body?.result)) return { total: body.result.length, items: body.result };
  if (Array.isArray(body?.data?.items)) return { total: body.data.items.length, items: body.data.items };
  return { total: 0, items: [] };
};

const AdminApi = {
  // GET /api/Admin/users?search=&role=&status=&semesterId=&page=&pageSize=
  // -> TRẢ VỀ { total, items }
  getUsers: (params = {}) =>
    api.get("/api/Admin/users", { params: clean(params) }).then((res) => {
      const body = res?.data !== undefined ? res.data : res;
      const { total, items } = extractPaged(body);
      if (!Array.isArray(items) || items.length === 0) {
        // eslint-disable-next-line no-console
        console.warn("[AdminApi.getUsers] Empty items. Body =", body);
      }
      return { total, items };
    }),

  // GET /api/Admin/users/enrollment-semesters
  // -> [{ semesterId, name }]
  getEnrollmentSemesters: () =>
    api.get("/api/Admin/users/enrollment-semesters").then((res) => res.data ?? []),

  getUserById: (id) => api.get(`/api/Admin/users/${id}`),
  createUser: (payload) => api.post("/api/Admin/users", payload),
  updateUser: (id, payload) => api.put(`/api/Admin/users/${id}`, payload),
  deleteUser: (id) => api.delete(`/api/Admin/users/${id}`),

  // (Tùy dự án) nếu BE có endpoint này
  setUserStatus: (id, isActive) =>
    api.patch(`/api/Admin/users/${id}/status`, { isActive }),

  importUsers: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/Admin/users/import", form); // axios tự set boundary
  },
};

export default AdminApi;
