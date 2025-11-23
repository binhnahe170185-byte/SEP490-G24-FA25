// src/api/News.js
import { api } from "./http";

// Chuẩn hoá response { code, data }
function unwrap(res) {
  const raw = res?.data || {};
  return raw.data ?? raw;
}

const NewsApi = {
  // GET /api/news
  getNews: (params = {}) =>
    api.get("/api/news", { params }).then((res) => {
      const body = res?.data ?? res;
      // Response structure: { code: 200, message: "Success", total, page, pageSize, data: [...] }
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
      return { total: 0, items: [] };
    }),

  // GET /api/news/{id}
  getNewsById: (id) => api.get(`/api/news/${id}`).then(unwrap),

  // POST /api/news
  createNews: (payload) => api.post("/api/news", payload).then(unwrap),

  // PUT /api/news/{id}
  updateNews: (id, payload) => api.put(`/api/news/${id}`, payload).then(unwrap),

  // DELETE /api/news/{id}
  deleteNews: (id) => api.delete(`/api/news/${id}`).then(unwrap),

  // POST /api/news/{id}/submit
  submitForReview: (id) => api.post(`/api/news/${id}/submit`).then(unwrap),

  // POST /api/news/{id}/approve
  approveNews: (id) => api.post(`/api/news/${id}/approve`).then(unwrap),

  // POST /api/news/{id}/reject
  rejectNews: (id, reviewComment) =>
    api.post(`/api/news/${id}/reject`, { reviewComment }).then(unwrap),

  // POST: api/news/image
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/api/news/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }).then(unwrap);
  },
};

export default NewsApi;

