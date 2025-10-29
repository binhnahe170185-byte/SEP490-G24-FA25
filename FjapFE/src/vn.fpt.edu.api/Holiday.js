import { api } from "./http";

// unwrap các dạng {code:200,data:{...}} | {data:{...}} | {...}
const unwrap = (res) => res?.data?.data ?? res?.data ?? res;

const HolidayApi = {
  // GET /api/Holiday
  getHolidays: (params = {}) =>
    api.get("/api/Holiday", { params }).then((res) => {
      const body = res?.data ?? res;
      if (body?.total !== undefined && Array.isArray(body?.items)) {
        return { total: body.total, items: body.items };
      }
      if (Array.isArray(body)) {
        return { total: body.length, items: body };
      }
      return { total: 0, items: [] };
    }),

  // GET /api/Holiday/{id}
  getHolidayById: (id) => api.get(`/api/Holiday/${id}`).then(unwrap),

  // POST /api/Holiday
  createHoliday: (payload) => api.post("/api/Holiday", payload).then(unwrap),

  // PUT /api/Holiday/{id}
  updateHoliday: (id, payload) => api.put(`/api/Holiday/${id}`, payload).then(unwrap),

  // DELETE /api/Holiday/{id}
  deleteHoliday: (id) => api.delete(`/api/Holiday/${id}`).then(unwrap),

  // GET /api/Holiday/semester/{semesterId}
  getHolidaysBySemester: (semesterId) =>
    api.get(`/api/Holiday/semester/${semesterId}`).then((res) => res?.data ?? []),

  // GET /api/Holiday/types
  getHolidayTypes: () => api.get("/api/Holiday/types").then((res) => res?.data ?? []),

  // POST /api/Holiday/bulk
  createBulkHolidays: (payload) =>
    api.post("/api/Holiday/bulk", payload).then(unwrap),

  // GET /api/Holiday/japan/{year} - Get Japan public holidays for a year
  getJapanHolidays: (year) =>
    api
      .get(`/api/Holiday/japan/${year}`)
      .then((res) => res?.data?.holidays ?? [])
      .catch((error) => {
        console.error("Error fetching Japan holidays:", error);
        return [];
      }),
};

export default HolidayApi;

