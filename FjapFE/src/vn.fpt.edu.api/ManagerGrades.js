import { api } from "../vn.fpt.edu.api/http";

class ManagerGrades {
  // ==========================================
  // CLASS & COURSE MANAGEMENT
  // ==========================================

  /**
   * Lấy danh sách lớp kèm thông tin điểm
   * @param {string} managerId - ID của manager (not used by backend)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>}
   */
  static async getCourses(managerId, filters = {}) {
    try {
      const params = {};
      
      // Map frontend filters to backend ClassGradeFilterRequest
      if (filters.semesterId && filters.semesterId > 0) {
        params.SemesterId = filters.semesterId;
      }
      
      if (filters.levelId && filters.levelId > 0) {
        params.LevelId = filters.levelId;
      }
      
      if (filters.status && filters.status !== "All Status") {
        // Backend CompletionStatus field expects: "100% Complete", "In Progress", "Not Started"
        params.CompletionStatus = filters.status;
      }
      
      if (filters.search) {
        params.SearchTerm = filters.search;
      }

      const response = await api.get("/api/manager/classes/with-grades", { params });
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
      const response = await api.get(`/api/manager/classes/${courseId}/grade-details`);
      const data = response.data?.data;
      
      if (!data) {
        throw new Error("No data returned from API");
      }

      // Map backend ClassGradeDetailDto to frontend format
      return {
        courseId: courseId,
        courseCode: data.subjectCode || "N/A",
        courseName: data.subjectName || data.className,
        className: data.className,
        semester: data.semesterName || "Unknown",
        students: (data.students || []).map(s => ({
          studentId: s.studentCode || s.studentId?.toString(),
          studentName: s.studentName || "Unknown",
          email: s.email || "N/A",
          // Grade components - backend returns these fields
          participation: s.participation,
          assignment: s.assignment,
          progressTest1: s.progressTest1,
          progressTest2: s.progressTest2,
          finalExam: s.finalExam,
          average: s.average,
          status: s.status || "Incomplete",
          gradeId: s.gradeId,
          // Grade component scores - new dynamic approach
          gradeComponentScores: (s.gradeComponentScores || []).map(gcs => ({
            subjectGradeTypeId: gcs.subjectGradeTypeId,
            gradeTypeName: gcs.gradeTypeName,
            score: gcs.score,
            comment: gcs.comment,
            status: gcs.status
          }))
        })),
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
      const detailsResponse = await api.get(`/api/manager/classes/${courseId}/grade-details`);
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
      const classResponse = await api.get(`/api/manager/classes/${courseId}`);
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