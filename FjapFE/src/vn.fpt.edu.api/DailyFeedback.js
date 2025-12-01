import { api } from "./http";

function unwrap(res) {
  const body = res?.data ?? res;
  return body?.data ?? body;
}

const DailyFeedbackApi = {
  // POST /api/daily-feedback
  createDailyFeedback: (payload) =>
    api.post("/api/daily-feedback", payload).then(unwrap),

  // GET /api/daily-feedback/student
  getStudentDailyFeedbacks: (params = {}) =>
    api.get("/api/daily-feedback/student", { params }).then((res) => {
      const body = res?.data ?? res;
      if (body?.total !== undefined && Array.isArray(body?.items)) {
        return { total: body.total, items: body.items };
      }
      if (body?.data?.total !== undefined && Array.isArray(body?.data?.items)) {
        return { total: body.data.total, items: body.data.items };
      }
      if (Array.isArray(body?.items)) {
        return { total: body.items.length, items: body.items };
      }
      if (Array.isArray(body)) {
        return { total: body.length, items: body };
      }
      return { total: 0, items: [] };
    }),

  // GET /api/daily-feedback/class/{classId}
  getClassDailyFeedbacks: (classId, params = {}) =>
    api.get(`/api/daily-feedback/class/${classId}`, { params }).then((res) => {
      const body = res?.data ?? res;
      if (body?.total !== undefined && Array.isArray(body?.items)) {
        return { total: body.total, items: body.items };
      }
      if (body?.data?.total !== undefined && Array.isArray(body?.data?.items)) {
        return { total: body.data.total, items: body.data.items };
      }
      if (Array.isArray(body?.items)) {
        return { total: body.items.length, items: body.items };
      }
      if (Array.isArray(body)) {
        return { total: body.length, items: body };
      }
      return { total: 0, items: [] };
    }),

  // GET /api/daily-feedback/lesson/{lessonId}
  checkFeedbackForLesson: (lessonId) =>
    api.get(`/api/daily-feedback/lesson/${lessonId}`).then(unwrap),

  // GET /api/daily-feedback/{id}
  getDailyFeedbackById: (id) =>
    api.get(`/api/daily-feedback/${id}`).then(unwrap),

  // PUT /api/daily-feedback/{id}/status
  updateStatus: (id, status) =>
    api.put(`/api/daily-feedback/${id}/status`, { status }).then(unwrap),
};

export default DailyFeedbackApi;

