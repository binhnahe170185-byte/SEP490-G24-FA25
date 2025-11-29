import { api } from "./http";

class AIApi {
  /**
   * Chat với AI Study Companion
   * @param {string} message - Câu hỏi của sinh viên
   * @param {string} context - Optional context (subject, lesson, etc.)
   * @returns {Promise<Object>}
   */
  static async chat(message, context = null) {
    try {
      const response = await api.post("/api/ai/chat", {
        message,
        context
      });
      return response.data?.data;
    } catch (error) {
      console.error("Error chatting with AI:", error);
      throw error;
    }
  }
}

export default AIApi;



