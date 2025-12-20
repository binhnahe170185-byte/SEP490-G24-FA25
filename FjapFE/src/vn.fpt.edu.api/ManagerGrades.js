import { api } from "../vn.fpt.edu.api/http";
import SubjectList from "./SubjectList";
import AttendanceApi from "./Attendance";

class ManagerGrades {
  // ==========================================
  // CLASS & COURSE MANAGEMENT
  // ==========================================

  /**
   * Lấy danh sách học kỳ
   * @returns {Promise<Array>}
   */
  static async getSemesters() {
    try {
      const response = await api.get("/api/Semester/options");
      const semesters = response.data?.data || [];

      // Map to format expected by SemesterTabs component
      return semesters.map(sem => ({
        semesterId: sem.semesterId || sem.id,
        name: sem.name || sem.semester_name
      }));
    } catch (error) {
      console.error("Error fetching semesters:", error);
      throw error;
    }
  }

  /**
   * Lấy danh sách lớp kèm thông tin điểm
   * @param {string} managerId - ID của manager (not used by backend)
   * @param {Object} filters - Filter options
   * @param {number|null} lecturerId - ID của lecturer (optional, for filtering classes taught by lecturer)
   * @param {boolean} isLecturer - Whether the current user is a lecturer
   * @returns {Promise<Array>}
   */
  static async getCourses(managerId, filters = {}, lecturerId = null, isLecturer = false) {
    try {
      const params = {};

      // Map frontend filters to backend ClassGradeFilterRequest
      // Only send SemesterId if it's a valid number (not null, not undefined, > 0)
      if (filters.semesterId != null && filters.semesterId !== undefined && filters.semesterId > 0) {
        params.SemesterId = filters.semesterId;
      }

      // Only send LevelId if it's a valid number (not null, not undefined, > 0)
      if (filters.levelId != null && filters.levelId !== undefined && filters.levelId > 0) {
        params.LevelId = filters.levelId;
      }

      // For lecturers: filter by LectureId directly (mimic Homeworks)
      if (isLecturer && lecturerId) {
        params.LectureId = lecturerId; // Use explicit LectureId
        // params.Status = "Active"; // Removed strict Active filter to match Homeworks
        // Only set status if explicitly provided in filters
        if (filters.status && filters.status !== "All Status") {
          params.Status = filters.status;
        }
      } else {
        // For managers: always show Active classes by default
        params.Status = "Active";

        // Also apply CompletionStatus filter if provided
        if (filters.status && filters.status !== "All Status") {
          // Backend CompletionStatus field expects: "100% Complete", "In Progress", "Not Started"
          params.CompletionStatus = filters.status;
        }
      }

      if (filters.search) {
        params.SearchTerm = filters.search;
      }

      const response = await api.get("/api/staffAcademic/classes/with-grades", { params });
      const classes = response.data?.data || [];

      // Map backend ClassGradeDto to frontend format
      return classes.map(cls => ({
        courseId: cls.classId.toString(),
        classId: cls.classId,

        // Course info
        courseCode: cls.subjectCode || "N/A",
        courseName: cls.subjectName || cls.className,
        className: cls.className,

        // Semester info
        semester: cls.semesterName || "Unknown",
        semesterId: cls.semesterId,
        startDate: this.formatDate(cls.semesterStartDate),
        endDate: this.formatDate(cls.semesterEndDate),

        // Subject info
        subjectId: cls.subjectId,

        // Student & grade statistics
        students: cls.totalStudents || 0,
        average: cls.averageScore || 0,
        passed: cls.passedCount || 0,
        failed: cls.failedCount || 0,
        incomplete: cls.incompleteCount || 0,

        // Progress info
        gradingProgress: cls.gradingProgress || 0,
        gradingTotal: cls.gradingTotal || cls.totalStudents || 0,
        gradingPercent: cls.gradingPercent || 0,
        completionPercent: cls.completionPercent || cls.gradingPercent || 0,
        completionStatus: cls.completionStatus || "Not Started",

        // Other info
        level: cls.levelName || "Unknown",
        levelId: cls.levelId,
        status: cls.status || "Active"
      }));
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết course và danh sách sinh viên với điểm
   * @param {string} managerId - ID của manager (not used by backend)
   * @param {string} courseId - ID của course/class
   * @returns {Promise<Object>}
   */
  static async getCourseDetails(managerId, courseId) {
    try {
      // Fetch detailed grade data
      const response = await api.get(`/api/staffAcademic/classes/${courseId}/grade-details`);
      const data = response.data?.data;

      // Also fetch class info to ensure we can obtain subject pass mark if grade-details doesn't include it
      let classInfo = null;
      try {
        const classResp = await api.get(`/api/staffAcademic/classes/${courseId}`);
        classInfo = classResp.data?.data || null;
      } catch (e) {
        // Ignore secondary failure; we'll fallback below
      }

      if (!data) {
        throw new Error("No data returned from API");
      }

      // Try to robustly extract pass mark from various possible fields
      const extractPassMark = (obj) => {
        if (!obj || typeof obj !== "object") return null;
        // Candidate key names that might represent pass mark
        const candidateKeys = [
          "passMark", "passmark", "pass_mark",
          "subjectPassMark", "subject_pass_mark",
          "passingMark", "passing_mark", "passingScore", "passing_score",
          "minPassScore", "min_pass_score",
          "minScore", "min_score",
          "passScore", "pass_score",
          "requiredScore", "required_score",
          "threshold", "passThreshold", "pass_threshold"
        ];
        // Direct keys on current object
        for (const key of Object.keys(obj)) {
          const lower = key.toLowerCase();
          if (candidateKeys.some(k => lower === k.toLowerCase())) {
            const val = obj[key];
            const num = typeof val === "number" ? val : parseFloat(val);
            if (!isNaN(num) && num >= 0 && num <= 10) return num;
          }
        }
        // Nested common containers
        const nestedCandidates = ["subject", "class", "course", "data", "meta"];
        for (const nk of nestedCandidates) {
          if (obj[nk]) {
            const nestedVal = extractPassMark(obj[nk]);
            if (nestedVal != null) return nestedVal;
          }
        }
        return null;
      };

      const derivedPassMark =
        extractPassMark(data) ??
        extractPassMark(classInfo) ??
        data.passMark ??
        data.subjectPassMark ??
        data.subject?.passMark ??
        classInfo?.subjectPassMark ??
        classInfo?.subject?.passMark ??
        null;

      // If still not found, try fetching subject by ID explicitly
      let finalPassMark = derivedPassMark;
      const subjectId =
        data.subjectId ??
        classInfo?.subjectId ??
        classInfo?.subject?.subjectId ??
        null;
      if ((finalPassMark == null || isNaN(finalPassMark)) && subjectId) {
        try {
          const subject = await SubjectList.getById(subjectId);
          // Try common fields on subject
          finalPassMark =
            subject?.passMark ??
            subject?.subjectPassMark ??
            subject?.minPassScore ??
            subject?.minScore ??
            subject?.passingScore ??
            null;
          if (finalPassMark != null) {
            const n = typeof finalPassMark === "number" ? finalPassMark : parseFloat(finalPassMark);
            finalPassMark = !isNaN(n) ? n : null;
          }
        } catch (e) {
          // ignore
        }
      }

      // Try fetching attendance report to enforce attendance-based pass rule
      let attendanceByStudent = {};
      try {
        const attendanceReport = await AttendanceApi.getAttendanceReport(courseId);
        if (Array.isArray(attendanceReport)) {
          attendanceReport.forEach(item => {
            // Robustly extract student identifier from nested student object or direct fields
            const studentObj = item.student || {};
            const sid = (studentObj.studentCode ?? studentObj.studentId ?? item.studentCode ?? item.studentId ?? "").toString();

            if (!sid) return;

            // Calculate from lessons array
            let present = 0;
            let total = 0;

            if (Array.isArray(item.lessons)) {
              total = item.lessons.length;
              present = item.lessons.filter(l => l.status === 'Present').length;
            } else {
              // Fallback to previous attempts if lessons array is missing (backward compatibility)
              present = item.presentCount ?? item.present ?? item.attended ?? item.presents ?? 0;
              const rawTotal = item.totalLessons ?? item.total ?? item.lessonCount ?? item.lessons ?? 0;
              const absent = item.absentCount ?? item.absent ?? item.absents ?? 0;
              total = typeof rawTotal === 'number' ? rawTotal : (present + absent);
            }

            const attendanceRate = total > 0 ? present / total : null;

            attendanceByStudent[sid] = {
              presentLessons: typeof present === "number" ? present : parseFloat(present) || 0,
              totalLessons: typeof total === "number" ? total : parseFloat(total) || 0,
              attendanceRate: attendanceRate
            };
          });
        }
      } catch (e) {
        // Ignore attendance fetch errors
      }

      // Map backend ClassGradeDetailDto to frontend format
      return {
        courseId: courseId,
        courseCode: data.subjectCode || "N/A",
        courseName: data.subjectName || data.className,
        className: data.className,
        semester: data.semesterName || "Unknown",
        // Pass mark from backend if available (try multiple sources)
        passMark: finalPassMark,
        students: (data.students || []).map(s => {
          const studentId = s.studentCode || s.studentId?.toString();
          const attendance = attendanceByStudent[studentId?.toString() || ""] || null;
          return {
            studentId: studentId,
            studentName: s.studentName || "Unknown",
            email: s.email || "N/A",
            // Attendance info (optional)
            attendanceRate: attendance?.attendanceRate ?? null,
            presentLessons: attendance?.presentLessons ?? null,
            totalLessons: attendance?.totalLessons ?? null,
            // Grade components - backend returns these fields
            participation: s.participation,
            assignment: s.assignment,
            progressTest1: s.progressTest1,
            progressTest2: s.progressTest2,
            finalExam: s.finalExam,
            average: s.average,
            status: s.status || "Inprogress",
            gradeId: s.gradeId,
            // Grade component scores - new dynamic approach
            gradeComponentScores: (s.gradeComponentScores || []).map(gcs => ({
              subjectGradeTypeId: gcs.subjectGradeTypeId,
              gradeTypeName: gcs.gradeTypeName,
              score: gcs.score,
              comment: gcs.comment,
              status: gcs.status
            }))
          };
        }),
        // Grade component weights from backend
        gradeComponentWeights: (data.gradeComponentWeights || []).map(w => ({
          subjectGradeTypeId: w.subjectGradeTypeId,
          gradeTypeName: w.gradeTypeName,
          weight: w.weight,
          maxScore: w.maxScore
        }))
      };
    } catch (error) {
      console.error("Error fetching course details:", error);
      throw error;
    }
  }

  // ==========================================
  // GRADE MANAGEMENT
  // ==========================================

  /**
   * Cập nhật điểm của sinh viên
   * @param {string} managerId - ID của manager
   * @param {string} courseId - ID của course/class
   * @param {string} studentId - Student code
   * @param {Object} gradeData - Dữ liệu điểm mới
   * @returns {Promise<Object>}
   */
  static async updateStudentGrade(managerId, courseId, studentId, gradeData) {
    try {
      // First, get the grade ID for this student
      const detailsResponse = await api.get(`/api/staffAcademic/classes/${courseId}/grade-details`);
      const details = detailsResponse.data?.data;

      if (!details || !details.students) {
        throw new Error("Could not find class details");
      }

      // Find student's grade record
      const studentRecord = details.students.find(s =>
        s.studentCode === studentId || s.studentId?.toString() === studentId
      );

      if (!studentRecord || !studentRecord.gradeId) {
        throw new Error("Grade record not found for this student");
      }

      const gradeId = studentRecord.gradeId;

      // Prepare grade components for API
      const gradeComponents = [];
      details.gradeComponentWeights?.forEach(weight => {
        let score = null;

        // Map grade data to score based on grade type name
        if (weight.gradeTypeName.toLowerCase().includes("attendance") ||
          weight.gradeTypeName.toLowerCase().includes("participation")) {
          score = gradeData.participation;
        } else if (weight.gradeTypeName.toLowerCase().includes("assignment")) {
          score = gradeData.assignment;
        } else if (weight.gradeTypeName.toLowerCase().includes("progress test 1") ||
          weight.gradeTypeName.toLowerCase().includes("pt1")) {
          score = gradeData.progressTest1;
        } else if (weight.gradeTypeName.toLowerCase().includes("progress test 2") ||
          weight.gradeTypeName.toLowerCase().includes("pt2")) {
          score = gradeData.progressTest2;
        } else if (weight.gradeTypeName.toLowerCase().includes("final")) {
          score = gradeData.finalExam;
        }

        if (score !== null && score !== undefined) {
          gradeComponents.push({
            subjectGradeTypeId: weight.subjectGradeTypeId,
            score: score,
            comment: null
          });
        }
      });

      // Call the new API endpoint
      await api.put("/api/manager/grades/components", {
        gradeId: gradeId,
        gradeComponents: gradeComponents
      });

      return {
        success: true,
        message: "Grade updated successfully"
      };
    } catch (error) {
      console.error("Error updating student grade:", error);
      throw error;
    }
  }

  /**
   * Cập nhật điểm thành phần của sinh viên (method mới)
   * @param {string} managerId - ID của manager
   * @param {string} courseId - ID của course/class
   * @param {string} studentId - Student code
   * @param {number} gradeId - Grade ID
   * @param {Array} gradeComponents - Danh sách grade components cần update
   * @returns {Promise<Object>}
   */
  static async updateStudentGradeComponents(managerId, courseId, studentId, gradeId, gradeComponents) {
    try {
      // Call the new API endpoint directly
      await api.put("/api/manager/grades/components", {
        gradeId: gradeId,
        gradeComponents: gradeComponents
      });

      return {
        success: true,
        message: "Grade components updated successfully"
      };
    } catch (error) {
      console.error("Error updating student grade components:", error);
      throw error;
    }
  }

  /**
   * Lấy thống kê điểm
   */
  static async getStatistics(filters = {}) {
    try {
      const params = {};
      if (filters.subjectId) params.SubjectId = filters.subjectId;
      if (filters.levelId) params.LevelId = filters.levelId;
      if (filters.semesterId) params.SemesterId = filters.semesterId;

      const response = await api.get("/api/manager/grades/statistics", { params });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error fetching statistics:", error);
      throw error;
    }
  }

  /**
   * Lấy dữ liệu biểu đồ dashboard (Pass Rate & Attendance Rate by Semester)
   */
  static async getDashboardCharts() {
    try {
      const response = await api.get("/api/manager/grades/dashboard-charts");
      return response.data?.data || { passRateBySemester: [], attendanceRateBySemester: [] };
    } catch (error) {
      console.error("Error fetching dashboard charts:", error);
      throw error;
    }
  }

  /**
   * Lấy filter options
   */
  static async getFilterOptions() {
    try {
      const response = await api.get("/api/manager/grades/filter-options");
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error fetching filter options:", error);
      throw error;
    }
  }

  // ==========================================
  // EXPORT
  // ==========================================

  /**
   * Export điểm của một course
   */
  static async exportCourseGrades(managerId, courseId) {
    try {
      // Get class details to find subjectId
      const classResponse = await api.get(`/api/staffAcademic/classes/${courseId}`);
      const classData = classResponse.data?.data;

      if (!classData?.subjectId) {
        throw new Error("Subject not found for this class");
      }

      const response = await api.get("/api/manager/grades/export", {
        params: { SubjectId: classData.subjectId },
        responseType: "blob"
      });

      // Download file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `grades_${classData.subjectCode || courseId}_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Error exporting course grades:", error);
      // Backend returns 501 Not Implemented
      if (error.response?.status === 501) {
        throw new Error("Export feature is not yet implemented on the server");
      }
      throw error;
    }
  }

  /**
   * Export tất cả điểm
   */
  static async exportAllGrades(managerId) {
    try {
      const response = await api.get("/api/manager/grades/export", {
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_grades_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Error exporting all grades:", error);
      if (error.response?.status === 501) {
        throw new Error("Export feature is not yet implemented on the server");
      }
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  static formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return "N/A";
    }
  }
}

export default ManagerGrades;