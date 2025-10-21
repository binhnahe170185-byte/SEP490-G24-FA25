// GradeManage/GradeManage.js
import React, { useState, useEffect, useCallback } from "react";
import { Breadcrumb, Button, Spin, message } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";
import FilterBar from "./FilterBar";
import CourseGrid from "./CourseGrid";

function GradeManage() {  // ⚠️ Chú ý: function declaration
  const { user } = useAuth();
  const managerId = user?.managerId || "MOCK_MANAGER_123";

  const [filters, setFilters] = useState({
    semester: "All Semesters",
    status: "All Status",
    level: "All Levels",
    search: ""
  });

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourses(managerId);
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error("Failed to load courses:", error);
      message.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    let filtered = [...courses];

    if (filters.semester !== "All Semesters") {
      filtered = filtered.filter(c => c.semester === filters.semester);
    }

    if (filters.status !== "All Status") {
      if (filters.status === "100% Complete") {
        filtered = filtered.filter(c => c.completionPercent === 100);
      } else if (filters.status === "In Progress") {
        filtered = filtered.filter(c => c.completionPercent > 0 && c.completionPercent < 100);
      } else if (filters.status === "Not Started") {
        filtered = filtered.filter(c => c.completionPercent === 0);
      }
    }

    if (filters.level !== "All Levels") {
      filtered = filtered.filter(c => c.level === filters.level);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.courseCode.toLowerCase().includes(searchLower) ||
        c.courseName.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCourses(filtered);
  }, [filters, courses]);

  const handleExportAll = async () => {
    try {
      message.loading("Exporting all grades...", 0);
      await ManagerGrades.exportAllGrades(managerId);
      message.destroy();
      message.success("All grades exported successfully");
    } catch (error) {
      message.destroy();
      console.error("Failed to export grades:", error);
      message.error("Failed to export grades");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading courses...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Breadcrumb
          items={[
            { title: "Management" },
            { title: "Grade Management" },
          ]}
        />
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

      <FilterBar 
        filters={filters}
        onFilterChange={setFilters}
        totalCount={filteredCourses.length}
      />

      <CourseGrid 
        courses={filteredCourses}
        managerId={managerId}
        onRefresh={loadCourses}
      />
    </div>
  );
}

export default GradeManage; // ✅ Phải có dòng này