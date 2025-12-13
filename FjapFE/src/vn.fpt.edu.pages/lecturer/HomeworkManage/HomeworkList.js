import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Breadcrumb,
  Spin
} from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../login/AuthContext';
import { useNotify } from '../../../vn.fpt.edu.common/notifications';
import SemesterTabs from '../../student/MarkReport/SemesterTabs';
import LecturerClassList from './LecturerClassList';
import SlotsList from './SlotsList';
import LecturerHomework from '../../../vn.fpt.edu.api/LecturerHomework';

const HomeworkList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { error: notifyError } = useNotify();
  const [semesters, setSemesters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);

  // Fallback lecturerId when payload does not include one
  const lecturerId = user?.lecturerId || user?.id || "MOCK_LECTURER_123";
  const restoreRef = useRef(location.state || null);

  // Load semesters
  const loadSemesters = useCallback(async () => {
    try {
      setLoading(true);
      const data = await LecturerHomework.getSemesters(lecturerId);
      setSemesters(data);
      if (data.length > 0) {
        setSelectedSemester(data[0]);
      }
    } catch (error) {
      console.error("Failed to load semesters:", error);
      console.error("Error response:", error?.response);

      let errorMessage = "Unable to load semesters. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      notifyError(
        "homework-semesters-load-error",
        "Load failed",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [lecturerId, notifyError]);

  // Load classes
  const loadClasses = useCallback(async () => {
    if (!selectedSemester) return;

    try {
      setClassesLoading(true);
      const data = await LecturerHomework.getClasses(
        lecturerId,
        selectedSemester.semesterId
      );

      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0]);
      } else {
        setSelectedClass(null);
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
      console.error("Error response:", error?.response);

      let errorMessage = "Unable to load classes. Please try again.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      notifyError(
        "homework-classes-load-error",
        "Load failed",
        errorMessage
      );
    } finally {
      setClassesLoading(false);
    }
  }, [lecturerId, selectedSemester, notifyError]);

  // Load semesters when the component mounts
  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  // Load classes whenever the semester changes
  useEffect(() => {
    if (selectedSemester) {
      loadClasses();
    }
  }, [selectedSemester, loadClasses]);

  useEffect(() => {
    if (!restoreRef.current) return;
    if (!semesters.length) return;

    const targetSemesterId =
      restoreRef.current.restoredSemesterId ||
      restoreRef.current.restoredCourse?.semesterId;
    if (!targetSemesterId) return;
    if (String(selectedSemester?.semesterId) === String(targetSemesterId)) {
      return;
    }
    const matched = semesters.find(
      (sem) => String(sem.semesterId) === String(targetSemesterId)
    );
    if (matched) {
      setSelectedSemester(matched);
    }
  }, [semesters, selectedSemester]);

  useEffect(() => {
    const payload = restoreRef.current;
    if (!payload) return;
    const targetSemesterId =
      payload.restoredSemesterId || payload.restoredCourse?.semesterId;
    if (targetSemesterId && String(selectedSemester?.semesterId) !== String(targetSemesterId)) {
      return;
    }
    if (!classes.length) return;
    const targetClassId = payload.restoredCourse?.classId;
    if (!targetClassId) {
      restoreRef.current = null;
      return;
    }
    const matched = classes.find(
      (cls) => String(cls.classId) === String(targetClassId)
    );
    if (matched) {
      setSelectedClass(matched);
    }
    restoreRef.current = null;
    navigate(location.pathname, { replace: true, state: null });
  }, [classes, selectedSemester, navigate, location.pathname]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading data...</p>
      </div>
    );
  }

  if (!semesters.length) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <h2>No semester data</h2>
        <p>You have not been assigned to any classes.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Reports" },
          { title: "Academic Reports" },
          { title: "Homework Management" },
        ]}
      />

      <h1 style={{ marginBottom: 24, fontSize: 28, fontWeight: 600 }}>Homework Management</h1>

      <SemesterTabs
        semesters={semesters}
        selectedSemester={selectedSemester}
        onSelectSemester={(semester) => {
          setSelectedSemester(semester);
          setSelectedClass(null); // Reset class selection when switching semesters
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 24 }}>
        <LecturerClassList
          classes={classes}
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          semester={selectedSemester}
          loading={classesLoading}
        />

        {selectedClass ? (
          <SlotsList
            course={selectedClass}
            lecturerId={lecturerId}
          />
        ) : (
          <div style={{
            backgroundColor: "white",
            padding: 40,
            borderRadius: 8,
            textAlign: "center",
            color: "#8c8c8c"
          }}>
            <p>Select a class to view its slots</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeworkList;
