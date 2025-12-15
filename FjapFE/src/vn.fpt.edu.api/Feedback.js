import { api } from "./http";

function unwrap(res) {
  const body = res?.data ?? res;
  return body?.data ?? body;
}

const FeedbackApi = {
  // POST /api/feedback
  createFeedback: (payload) =>
    api.post("/api/feedback", payload).then(unwrap),

  // GET /api/feedback
  getFeedbacks: (params = {}) =>
    api.get("/api/feedback", { params }).then((res) => {
      const body = res?.data ?? res;
      console.log("FeedbackApi.getFeedbacks response:", body);
      
      // Backend returns: { code: 200, message: "Success", total, page, pageSize, data: [...] }
      if (body?.code === 200 && body?.total !== undefined && Array.isArray(body?.data)) {
        return { total: body.total, items: body.data };
      }
      
      // Fallback formats
      if (body?.total !== undefined && Array.isArray(body?.data)) {
        return { total: body.total, items: body.data };
      }
      if (body?.data?.total !== undefined && Array.isArray(body?.data?.data)) {
        return { total: body.data.total, items: body.data.data };
      }
      if (Array.isArray(body?.data)) {
        return { total: body.data.length, items: body.data };
      }
      if (Array.isArray(body)) {
        return { total: body.length, items: body };
      }
      
      console.warn("Unexpected response format in getFeedbacks:", body);
      return { total: 0, items: [] };
    }),

  // GET /api/feedback/{id}
  getFeedbackById: (id) => api.get(`/api/feedback/${id}`).then(unwrap),

  // PUT /api/feedback/{id}/status
  updateFeedbackStatus: (id, status) =>
    api.put(`/api/feedback/${id}/status`, { status }).then(unwrap),

  // POST /api/feedback/{id}/analyze
  reAnalyzeFeedback: (id) =>
    api.post(`/api/feedback/${id}/analyze`).then(unwrap),

  // GET /api/feedback/pending
  getPendingFeedbackClasses: () =>
    api.get("/api/feedback/pending").then(unwrap),

  // GET /api/feedback/lecturer/classes
  getLecturerClassesWithFeedback: () =>
    api.get("/api/feedback/lecturer/classes").then(unwrap),

  // GET /api/feedback/lecturer/class/{classId}/feedbacks
  getLecturerClassFeedbacks: (classId) =>
    api
      .get(`/api/feedback/lecturer/class/${classId}/feedbacks`)
      .then(unwrap),

  // GET /api/feedback/analytics/pareto
  getIssuePareto: (params = {}) =>
    api
      .get("/api/feedback/analytics/pareto", { params })
      .then((res) => {
        const body = res?.data ?? res;
        const data = body?.data ?? body;
        return Array.isArray(data) ? data : [];
      }),

  // POST /api/feedback/re-analyze-all
  reAnalyzeAllWithoutCategory: (limit = null) =>
    api
      .post("/api/feedback/re-analyze-all", null, { params: limit ? { limit } : {} })
      .then((res) => {
        const body = res?.data ?? res;
        return body?.data ?? body;
      }),

  // GET /api/feedback/question-pareto
  getQuestionPareto: (params = {}) =>
    api
      .get("/api/feedback/question-pareto", { params })
      .then((res) => {
        const body = res?.data ?? res;
        const data = body?.data ?? body;
        return Array.isArray(data) ? data : [];
      }),

  // GET /api/feedback/text-summary
  getTextSummary: (params = {}) =>
    api
      .get("/api/feedback/text-summary", { params })
      .then((res) => {
        const body = res?.data ?? res;
        return body?.data ?? body;
      }),
};

export default FeedbackApi;

