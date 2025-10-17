import { api } from "./http";

// lọc param rỗng
const clean = (o = {}) =>
  Object.fromEntries(
    Object.entries(o).filter(([_, v]) => v !== undefined && v !== null && v !== "")
  );

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

// trả { total, items }
const extractPaged = (body) => {
  if (body?.total !== undefined && Array.isArray(body?.items))
    return { total: body.total, items: body.items };
  if (body?.data?.total !== undefined && Array.isArray(body?.data?.items))
    return { total: body.data.total, items: body.data.items };
  if (Array.isArray(body)) return { total: body.length, items: body };
  if (Array.isArray(body?.data)) return { total: body.data.length, items: body.data };
  if (Array.isArray(body?.items)) return { total: body.items.length, items: body.items };
  if (Array.isArray(body?.result)) return { total: body.result.length, items: body.result };
  if (Array.isArray(body?.data?.items))
    return { total: body.data.items.length, items: body.data.items };
  return { total: 0, items: [] };
};

const AdminApi = {
  // GET /api/Admin/users
  getUsers: (params = {}) =>
    api.get("/api/Admin/users", { params: clean(params) }).then((res) => {
      const body = res?.data ?? res;
      const { total, items } = extractPaged(body);
      return { total, items };
    }),

  // GET /api/Admin/users/enrollment-semesters -> [{ semesterId, name }]
  getEnrollmentSemesters: () =>
    api.get("/api/Admin/users/enrollment-semesters").then((res) => res?.data ?? []),

  // DETAIL / CRUD
  getUserById: (id) => api.get(`/api/Admin/users/${id}`).then(unwrap),
  createUser: (payload) => api.post("/api/Admin/users", payload).then(unwrap),
  updateUser: (id, payload) => api.put(`/api/Admin/users/${id}`, payload).then(unwrap),
  deleteUser: (id) => api.delete(`/api/Admin/users/${id}`).then(unwrap),

  setUserStatus: (id, isActive) =>
    api.patch(`/api/Admin/users/${id}/status`, { isActive }).then(unwrap),

  importUsers: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/Admin/users/import", form).then(unwrap);
  },
};

export default AdminApi;
