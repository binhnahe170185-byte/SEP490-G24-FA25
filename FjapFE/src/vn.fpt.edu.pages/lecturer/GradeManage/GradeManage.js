import React, { useState, useEffect, useCallback } from "react";
import { Breadcrumb, Button, Spin, message, Input } from "antd";
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";
import CourseGrid from "./CourseGrid";
import SemesterTabs from "../../student/MarkReport/SemesterTabs";

function GradeManage() {
  const { user } = useAuth();
  const location = useLocation();
  const userId = user?.id || user?.accountId || user?.lecturerId;
  const isLecturer = true;

  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [searchText, setSearchText] = useState("");

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semestersLoading, setSemestersLoading] = useState(true);

  // Load semesters
  const loadSemesters = useCallback(async () => {
    try {
      setSemestersLoading(true);
      const data = await ManagerGrades.getSemesters();
      setSemesters(data);
      if (data.length > 0) {
        setSelectedSemester(data[0]);
      }
    } catch (error) {
      console.error("Failed to load semesters:", error);
      message.error("Failed to load semesters");
    } finally {
      setSemestersLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    if (!selectedSemester) return;

    if (!userId) {
      console.error("UserId is undefined!");
      message.error("User ID not found. Please re-login.");
      return;
    }

    try {
      setLoading(true);
      // Backend will find LectureId from UserId to filter classes
      const filters = {
        semesterId: selectedSemester.semesterId
      };

      // Use user.lecturerId if available to mimic Homeworks logic
      const lecturerId = user?.lecturerId || user?.LecturerId;

      console.log("Calling getCourses with lecturerId:", lecturerId);
      // Pass lecturerId as the 3rd argument (was userId)
      const data = await ManagerGrades.getCourses(userId, filters, lecturerId, true);
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error("Failed to load courses:", error);
      message.error("Failed to load courses: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [userId, selectedSemester]);

  // Load semesters when component mounts
  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  // Load courses when semester or filters change
  useEffect(() => {
    if (selectedSemester) {
      loadCourses();
    }
  }, [selectedSemester, loadCourses]);

  // Client-side search filtering
  useEffect(() => {
    let filtered = [...courses];

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(c =>
        c.courseCode?.toLowerCase().includes(searchLower) ||
        c.courseName?.toLowerCase().includes(searchLower) ||
        c.className?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCourses(filtered);
  }, [searchText, courses]);

  const handleExportAll = async () => {
    try {
      message.loading("Exporting all grades...", 0);
      await ManagerGrades.exportAllGrades(userId);
      message.destroy();
      message.success("All grades exported successfully");
    } catch (error) {
      message.destroy();
      console.error("Failed to export grades:", error);
      message.error(error.message || "Failed to export grades");
    }
  };

  if (semestersLoading) {
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
        <p>No semesters available.</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: "24px",
      backgroundColor: "#f0f2f5",
      minHeight: "100vh"
    }}>
      {/* Header Section */}
      <div style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 24px",
        backgroundColor: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <div>
          <Breadcrumb
            items={[
              { title: "Lecturer" },
              { title: "Grade Management" },
            ]}
            style={{ marginBottom: 8 }}
          />
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: "#262626"
          }}>
            My Teaching Classes
          </h1>
          <p style={{
            margin: "4px 0 0 0",
            color: "#8c8c8c",
            fontSize: 14
          }}>
            Manage grades for classes you are teaching
          </p>
        </div>
        <div>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadCourses}
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportAll}
          >
            Export All
          </Button>
        </div>
      </div>

      <SemesterTabs
        semesters={semesters}
        selectedSemester={selectedSemester}
        onSelectSemester={(semester) => {
          setSelectedSemester(semester);
        }}
      />

      {/* Search Bar */}
      <div style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16
      }}>
        <Input
          placeholder="Search by course code, name, or class name..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
          size="large"
        />
        <div style={{ color: "#8c8c8c", fontSize: 14 }}>
          Found <strong style={{ color: "#262626", fontSize: 16 }}>{filteredCourses.length}</strong> course{filteredCourses.length !== 1 ? 's' : ''}
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            color: "#52c41a",
            padding: "4px 12px",
            backgroundColor: "#f6ffed",
            borderRadius: 4
          }}>
            ✓ Showing only Active classes
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <p style={{ marginTop: 16 }}>Loading courses...</p>
        </div>
      ) : (
        <CourseGrid
          courses={filteredCourses}
          userId={userId}
          onRefresh={loadCourses}
        />
      )}
    </div>
  );
}

export default GradeManage;