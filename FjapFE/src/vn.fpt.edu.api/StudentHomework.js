import { api } from "./http";

class StudentHomework {
  static async submitHomework({
    homeworkId,
    studentId,
    method,
    comment,
    files = [],
    driveLink,
    docLink,
  }) {
    if (!homeworkId) {
      throw new Error("homeworkId is required");
    }

    const endpoint = `/api/Homeworks/${homeworkId}/submissions`;
    const normalizedMethod = method || "local";

    try {
      const formData = new FormData();
      formData.append("method", normalizedMethod);
      if (studentId !== undefined && studentId !== null) {
        formData.append("studentId", String(studentId));
      }
      if (comment) formData.append("comment", comment);
      if (driveLink) formData.append("driveLink", driveLink);
      if (docLink) formData.append("docLink", docLink);

      files
        .filter((file) => file?.originFileObj instanceof File)
        .forEach((file) => {
          formData.append("files", file.originFileObj);
        });

      const response = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to submit homework:", error);
      throw error;
    }
  }

  static async getStudentHomeworks(studentId, filters = {}) {
    try {
      const response = await api.get('/api/Homeworks', {
        params: { studentId, ...filters }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error("Failed to load student homeworks:", error);
      throw error;
    }
  }

}

export default StudentHomework;
