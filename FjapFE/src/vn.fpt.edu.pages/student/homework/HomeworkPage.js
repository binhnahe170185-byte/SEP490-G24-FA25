import React, { useState, useEffect, useCallback, useRef } from "react";
import { Breadcrumb, message, Spin } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { FileTextOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import SemesterTabs from "../MarkReport/SemesterTabs";
import HomeworkCourseList from "./components/HomeworkCourseList";
import LessonHomeworkTable from "./components/LessonHomeworkTable";
import StudentGrades from "../../../vn.fpt.edu.api/StudentGrades";

const HomeworkPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const studentId = user?.studentId || user?.id || "MOCK_STUDENT_001";
  const restoreRef = useRef(location.state || null);

  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const loadSemesters = useCallback(async () => {
    try {
      setLoadingSemesters(true);
      const data = await StudentGrades.getSemesters(studentId);
      const normalized = Array.isArray(data) ? data : [];
      setSemesters(normalized);

      const restoreSemesterId =
        restoreRef.current?.restoredSemesterId ||
        restoreRef.current?.restoredCourse?.semesterId;
      let initialSemester = normalized[0] || null;
      if (restoreSemesterId) {
        const matched = normalized.find(
          (semester) => String(semester.semesterId) === String(restoreSemesterId)
        );
        if (matched) {
          initialSemester = matched;
        }
      }
      setSelectedSemester(initialSemester);
    } catch (error) {
      console.error("Failed to load semesters:", error);
      message.error("Unable to load semesters");
      setSemesters([]);
      setSelectedSemester(null);
    } finally {
      setLoadingSemesters(false);
    }
  }, [studentId]);

  const loadCourses = useCallback(async () => {
    if (!selectedSemester) return;
    try {
      setLoadingCourses(true);
      const data = await StudentGrades.getCourses(
        studentId,
        selectedSemester.semesterId
      );
      const normalized = (Array.isArray(data) ? data : []).map((course) => ({
        ...course,
        courseId: course.courseId || course.classId || course.id,
        classId: course.classId || course.courseId || course.id,
        subjectCode:
          course.subjectCode ||
          course.subject?.code ||
          course.subject_id,
        subjectName:
          course.subjectName ||
          course.subject?.name ||
          course.courseName ||
          course.subject_name,
        className: course.className || course.classCode || course.groupName,
        classCode: course.classCode || course.className,
      }));
      setCourses(normalized);

      const restorePayload = restoreRef.current;
      const restoreSemesterId =
        restorePayload?.restoredSemesterId ||
        restorePayload?.restoredCourse?.semesterId;
      let initialCourse = normalized[0] || null;

      if (
        restorePayload &&
        (!restoreSemesterId ||
          String(restoreSemesterId) === String(selectedSemester.semesterId))
      ) {
        const targetCourseId =
          restorePayload.restoredCourse?.classId ||
          restorePayload.restoredCourse?.courseId ||
          restorePayload.restoredCourse?.id;

        if (targetCourseId) {
          const matched = normalized.find((course) =>
            [course.classId, course.courseId, course.id]
              .filter((val) => val !== undefined && val !== null)
              .some((val) => String(val) === String(targetCourseId))
          );
          if (matched) {
            initialCourse = matched;
            restoreRef.current = null;
            navigate(location.pathname + location.search, {
              replace: true,
              state: null,
            });
          }
        }
      }

      setSelectedCourse(initialCourse);
    } catch (error) {
      console.error("Failed to load courses:", error);
      message.error("Unable to load courses for this semester");
      setCourses([]);
      setSelectedCourse(null);
    } finally {
      setLoadingCourses(false);
    }
  }, [studentId, selectedSemester, navigate, location.pathname, location.search]);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (selectedSemester) {
      loadCourses();
    } else {
      setCourses([]);
      setSelectedCourse(null);
    }
  }, [selectedSemester, loadCourses]);

  if (loadingSemesters) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading semesters...</p>
      </div>
    );
  }

  if (!semesters.length) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>No semester data</h2>
        <p>We could not find any study semester for your account.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Studies" },
          { title: "Homework" },
        ]}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <FileTextOutlined style={{ fontSize: 28, color: "#1890ff" }} />
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Homework Overview</h1>
      </div>

      <SemesterTabs
        semesters={semesters}
        selectedSemester={selectedSemester}
        onSelectSemester={(semester) => {
          setSelectedSemester(semester);
          setSelectedCourse(null);
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 24 }}>
        <HomeworkCourseList
          courses={courses}
          selectedCourse={selectedCourse}
          onSelectCourse={setSelectedCourse}
          semester={selectedSemester}
          loading={loadingCourses}
        />

        <LessonHomeworkTable
          course={selectedCourse}
          semester={selectedSemester}
        />
      </div>
    </div>
  );
};

export default HomeworkPage;
