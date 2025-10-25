import React, { useState, useEffect, useCallback } from "react";
import { Breadcrumb, Button, Spin, message } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";
import FilterBar from "./FilterBar";
import CourseGrid from "./CourseGrid";

function GradeManage() {
  const { user } = useAuth();
  const managerId = user?.managerId || "MOCK_MANAGER_123";

  const [filters, setFilters] = useState({
    semester: "All Semesters",
    semesterId: null,
    status: "All Status",
    level: "All Levels",
    levelId: null,
    search: ""
  });

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      // Pass filters to API
      const data = await ManagerGrades.getCourses(managerId, filters);
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error("Failed to load courses:", error);
      message.error("Failed to load courses: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [managerId, filters]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Client-side filtering for better UX (backend already filters most)
  useEffect(() => {
    let filtered = [...courses];

    // Additional client-side search if needed
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.courseCode?.toLowerCase().includes(searchLower) ||
        c.courseName?.toLowerCase().includes(searchLower) ||
        c.className?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredCourses(filtered);
  }, [filters.search, courses]);

  const handleExportAll = async () => {
    try {
      message.loading("Exporting all grades...", 0);
      await ManagerGrades.exportAllGrades(managerId);
      message.destroy();
      message.success("All grades exported successfully");
    } catch (error) {
      message.destroy();
      console.error("Failed to export grades:", error);
      message.error(error.message || "Failed to export grades");
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

export default GradeManage;