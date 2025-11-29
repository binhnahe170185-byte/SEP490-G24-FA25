import { api } from "./http";

function unwrap(res) {
  const body = res?.data ?? res;
  return body?.data ?? body;
}

const FeedbackQuestionApi = {
  // GET /api/feedback/questions?subjectId={subjectId}
  getActiveQuestions: (subjectId) =>
    api
      .get("/api/feedback/questions", {
        params: subjectId ? { subjectId } : {},
      })
      .then(unwrap),

  // GET /api/feedback/questions/all
  getAllQuestions: () =>
    api.get("/api/feedback/questions/all").then(unwrap),

  // POST /api/feedback/questions
  createQuestion: (payload) =>
    api.post("/api/feedback/questions", payload).then(unwrap),

  // PUT /api/feedback/questions/{id}
  updateQuestion: (id, payload) =>
    api.put(`/api/feedback/questions/${id}`, payload).then(unwrap),

  // DELETE /api/feedback/questions/{id}
  deleteQuestion: (id) =>
    api.delete(`/api/feedback/questions/${id}`).then(unwrap),
};

export default FeedbackQuestionApi;

