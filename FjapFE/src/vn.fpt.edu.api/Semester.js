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

const SemesterApi = {
  // GET /api/Semester
  getSemesters: (params = {}) =>
    api.get("/api/Semester", { params: clean(params) }).then((res) => {
      const body = res?.data ?? res;
      const { total, items } = extractPaged(body);
      return { total, items };
    }),

  // GET /api/Semester/{id}
  getSemesterById: (id) => api.get(`/api/Semester/${id}`).then(unwrap),

  // POST /api/Semester
  createSemester: (payload) => api.post("/api/Semester", payload).then(unwrap),

  // PUT /api/Semester/{id}
  updateSemester: (id, payload) => api.put(`/api/Semester/${id}`, payload).then(unwrap),

  // DELETE /api/Semester/{id}
  deleteSemester: (id) => api.delete(`/api/Semester/${id}`).then(unwrap),

  // GET /api/Semester/active
  getActiveSemesters: () =>
    api.get("/api/Semester/active").then((res) => res?.data ?? []),

  // GET /api/Semester/upcoming
  getUpcomingSemesters: () =>
    api.get("/api/Semester/upcoming").then((res) => res?.data ?? []),
};

export default SemesterApi;
