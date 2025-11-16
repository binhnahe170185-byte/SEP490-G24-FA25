import { api } from "./http";

class LecturerHomework {
  // Lấy danh sách học kỳ mà giảng viên có dạy
  static async getSemesters(lecturerId) {
    try {
      // Tạm thời dùng API Semester chung
      // TODO: Thay bằng endpoint thực tế cho lecturer: /api/Lecturers/{lecturerId}/semesters
      const response = await api.get(`/api/Semester`);
      const body = response.data;
      
      // Handle different response formats
      let semesters = [];
      if (body?.data?.items) {
        semesters = body.data.items;
      } else if (body?.items) {
        semesters = body.items;
      } else if (Array.isArray(body?.data)) {
        semesters = body.data;
      } else if (Array.isArray(body)) {
        semesters = body;
      }
      
      // Map to format expected by component
      return semesters.map(sem => ({
        semesterId: sem.semesterId || sem.id,
        name: sem.name || sem.semesterName,
      }));
    } catch (error) {
      console.error("Failed to load semesters:", error);
      // Return mock data for development
      return [
        { semesterId: 1, name: "2025 Fall" },
        { semesterId: 2, name: "2025 Summer" },
        { semesterId: 3, name: "2025 Spring" },
      ];
    }
  }

  // Lấy danh sách lớp mà giảng viên dạy trong một semester
  static async getClasses(lecturerId, semesterId) {
    try {
      // Sử dụng endpoint thực tế: /api/Lecturers/{lecturerId}/classes?semesterId={semesterId}
      const response = await api.get(`/api/Lecturers/${lecturerId}/classes`, {
        params: { semesterId: semesterId }
      });
      const classes = response.data?.data || response.data || [];
      
      // Map to format expected by frontend
      // Một lớp chỉ có 1 môn học (subject), lấy từ subject đầu tiên trong subjects array (nếu có)
      return classes.map(cls => {
        const firstSubject = cls.subjects && cls.subjects.length > 0 ? cls.subjects[0] : null;
        return {
          classId: cls.classId,
          className: cls.className,
          classCode: cls.classCode || cls.className,
          semesterId: cls.semesterId,
          startDate: cls.startDate,
          endDate: cls.endDate,
          // Include subject info directly in class object
          subjectId: firstSubject?.subjectId,
          subjectCode: firstSubject?.subjectCode,
          subjectName: firstSubject?.subjectName
        };
      });
    } catch (error) {
      console.error("Failed to load classes:", error);
      // Return mock data for development
      return [
        {
          classId: 1,
          className: "HCM202-AE1",
          classCode: "HCM202-AE1",
          semesterId: semesterId,
          startDate: "2025-05-12",
          endDate: "2025-06-12",
          subjects: [
            {
              subjectId: 1,
              subjectCode: "HCM202",
              subjectName: "Ho Chi Minh Ideology",
            }
          ]
        },
      ];
    }
  }

  // Lấy danh sách môn học trong một lớp
  static async getSubjectsByClass(classId) {
    try {
      // TODO: Thay bằng endpoint thực tế: /api/Classes/{classId}/subjects
      const response = await api.get(`/api/staffAcademic/classes/${classId}`);
      const classData = response.data?.data || response.data;
      
      if (!classData) return [];
      
      // Extract subjects from class data
      const subjects = [];
      if (classData.subject) {
        subjects.push({
          subjectId: classData.subject.id || classData.subjectId,
          subjectCode: classData.subject.code || classData.subjectCode,
          subjectName: classData.subject.name || classData.subjectName,
        });
      } else if (Array.isArray(classData.subjects)) {
        subjects.push(...classData.subjects.map(subj => ({
          subjectId: subj.id || subj.subjectId,
          subjectCode: subj.code || subj.subjectCode,
          subjectName: subj.name || subj.subjectName,
        })));
      }
      
      return subjects;
    } catch (error) {
      console.error("Failed to load subjects:", error);
      return [];
    }
  }

  // Lấy danh sách slot/lesson của một môn học
  static async getSlots(classId) {
    try {
      // TODO: Thay bằng endpoint thực tế: /api/Classes/{classId}/lessons hoặc /api/Lessons?classId={classId}
      const response = await api.get(`/api/Classes/${classId}/lessons`);
      const lessons = response.data?.data || response.data || [];
      
      // Map lessons to slots format
      return lessons.map(lesson => ({
        slotId: lesson.timeId || lesson.slotId,
        lessonId: lesson.lessonId || lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        roomName: lesson.roomName || lesson.room?.roomName,
        roomId: lesson.roomId || lesson.room?.roomId,
        classId: lesson.classId,
        className: lesson.className,
        subjectCode: lesson.subjectCode,
      }));
    } catch (error) {
      console.error("Failed to load slots:", error);
      // Return mock data for development
      return [
        {
          slotId: 1,
          lessonId: 1,
          date: "2025-05-15",
          startTime: "07:30",
          endTime: "09:50",
          roomName: "Room 101",
          roomId: 1,
          classId: classId,
          className: "HCM202-AE1",
          subjectCode: "HCM202",
        },
        {
          slotId: 2,
          lessonId: 2,
          date: "2025-05-17",
          startTime: "07:30",
          endTime: "09:50",
          roomName: "Room 101",
          roomId: 1,
          classId: classId,
          className: "HCM202-AE1",
          subjectCode: "HCM202",
        },
      ];
    }
  }

  // Lấy danh sách homework của một slot/lesson
  static async getHomeworksBySlot(lessonId, classId) {
    try {
      // TODO: Thay bằng endpoint thực tế: /api/Lessons/{lessonId}/homeworks hoặc /api/Homeworks?lessonId={lessonId}
      const response = await api.get(`/api/Homeworks`, {
        params: { lessonId: lessonId }
      });
      const homeworks = response.data?.data || response.data || [];
      
      return homeworks.map(hw => ({
        homeworkId: hw.homeworkId || hw.id,
        title: hw.title,
        content: hw.content || hw.description,
        deadline: hw.deadline || hw.dueDate,
        filePath: hw.filePath,
        submissions: hw.submissions || 0,
        totalStudents: hw.totalStudents || 0,
        createdAt: hw.createdAt,
        lessonId: hw.lessonId || lessonId,
        createdBy: hw.createdBy || hw.created_by,
        createdByName:
          hw.createdByName ||
          hw.createdByFullName ||
          hw.createdByUser?.fullName ||
          hw.created_by_name,
      }));
    } catch (error) {
      console.error("Failed to load homeworks:", error);
      return [];
    }
  }

  static async getHomeworkSubmissions(homeworkId) {
    try {
      const response = await api.get(`/api/Homeworks/${homeworkId}/submissions`);
      const submissions = response.data?.data || response.data || [];
      return submissions.map((item) => ({
        submissionId: item.submissionId || item.homeworkSubmissionId,
        homeworkId: item.homeworkId,
        studentId: item.studentId,
        studentCode: item.studentCode,
        studentName: item.studentName,
        submittedAt: item.submittedAt,
        status: item.status,
        comment: item.comment,
        filePath: item.filePath,
      }));
    } catch (error) {
      console.error("Failed to load homework submissions:", error);
      throw error;
    }
  }

  static async updateHomeworkSubmission(homeworkId, submissionId, payload) {
    try {
      const response = await api.put(
        `/api/Homeworks/${homeworkId}/submissions/${submissionId}`,
        payload
      );
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to update homework submission:", error);
      throw error;
    }
  }

  // Tạo bài tập mới
  static buildMultipartConfig(payload) {
    if (typeof FormData !== "undefined" && payload instanceof FormData) {
      return { headers: { "Content-Type": "multipart/form-data" } };
    }
    return undefined;
  }

  static async createHomework(data, isFormData = false) {
    try {
      const config =
        isFormData || (typeof FormData !== "undefined" && data instanceof FormData)
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : undefined;
      const response = await api.post(`/api/Homeworks`, data, config);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to create homework:", error);
      throw error;
    }
  }

  // Cập nhật bài tập
  static async updateHomework(homeworkId, data, isFormData = false) {
    try {
      const config =
        isFormData || (typeof FormData !== "undefined" && data instanceof FormData)
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : undefined;
      const response = await api.put(`/api/Homeworks/${homeworkId}`, data, config);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to update homework:", error);
      throw error;
    }
  }

  // Xóa bài tập
  static async deleteHomework(homeworkId) {
    try {
      // TODO: Thay bằng endpoint thực tế: /api/Homeworks/{homeworkId}
      const response = await api.delete(`/api/Homeworks/${homeworkId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Failed to delete homework:", error);
      throw error;
    }
  }

  // Lấy danh sách homework của một môn học
  static async getHomeworksByCourse(classId) {
    try {
      // TODO: Thay bằng endpoint thực tế: /api/Classes/{classId}/homeworks
      const response = await api.get(`/api/Classes/${classId}/homeworks`);
      const homeworks = response.data?.data || response.data || [];
      
      return homeworks.map(hw => ({
        homeworkId: hw.homeworkId || hw.id,
        title: hw.title,
        description: hw.description,
        dueDate: hw.dueDate,
        status: hw.status,
        submissions: hw.submissions || 0,
        totalStudents: hw.totalStudents || 0,
        createdAt: hw.createdAt,
        attachments: hw.attachments || [],
        lessonId: hw.lessonId,
        slotId: hw.slotId,
      }));
    } catch (error) {
      console.error("Failed to load homeworks:", error);
      return [];
    }
  }
}

export default LecturerHomework;
