import React, { useState, useEffect } from "react";
import { Card, Select, Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { api } from "../../../vn.fpt.edu.api/http";

const { Option } = Select;

const statuses = ["All Status", "100% Complete", "In Progress", "Not Started"];

function FilterBar({ filters, onFilterChange, totalCount }) {
  const [semesters, setSemesters] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load semesters và levels từ API
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoading(true);
        
        // Lấy options từ classes/options endpoint
        const response = await api.get("/api/manager/classes/options");
        const data = response.data?.data;
        
        if (data) {
          // Map semesters với ID
          const semesterOptions = [{ id: null, name: "All Semesters" }];
          if (data.semesters && Array.isArray(data.semesters)) {
            data.semesters.forEach(sem => {
              if (sem.id && sem.name) {
                semesterOptions.push({ id: sem.id, name: sem.name });
              }
            });
          }
          setSemesters(semesterOptions);

          // Map levels với ID
          const levelOptions = [{ id: null, name: "All Levels" }];
          if (data.levels && Array.isArray(data.levels)) {
            data.levels.forEach(level => {
              if (level.id && level.name) {
                levelOptions.push({ id: level.id, name: level.name });
              }
            });
          }
          setLevels(levelOptions);
        }
      } catch (error) {
        console.error("Failed to load filter options:", error);
        // Fallback to default values
        setSemesters([
          { id: null, name: "All Semesters" },
          { id: 1, name: "Summer 2025" },
          { id: 2, name: "Spring 2025" }
        ]);
        setLevels([
          { id: null, name: "All Levels" },
          { id: 1, name: "Undergraduate" },
          { id: 2, name: "Graduate" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, []);

  const handleSemesterChange = (value) => {
    // value là JSON string: {"id": 1, "name": "Summer 2025"}
    const selected = JSON.parse(value);
    onFilterChange({
      ...filters,
      semester: selected.name,
      semesterId: selected.id
    });
  };

  const handleLevelChange = (value) => {
    // value là JSON string: {"id": 1, "name": "Undergraduate"}
    const selected = JSON.parse(value);
    onFilterChange({
      ...filters,
      level: selected.name,
      levelId: selected.id
    });
  };

  const handleStatusChange = (value) => {
    onFilterChange({
      ...filters,
      status: value
    });
  };

  const handleSearchChange = (e) => {
    onFilterChange({
      ...filters,
      search: e.target.value
    });
  };

  if (loading) {
    return (
      <Card style={{ marginBottom: 24, textAlign: "center", padding: 20 }}>
        <Spin size="small" />
        <span style={{ marginLeft: 8 }}>Loading filters...</span>
      </Card>
    );
  }

  // Get current selected values
  const currentSemester = semesters.find(s => s.name === filters.semester) || semesters[0];
  const currentLevel = levels.find(l => l.name === filters.level) || levels[0];

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
            Semester
          </label>
          <Select
            value={JSON.stringify({ id: currentSemester.id, name: currentSemester.name })}
            onChange={handleSemesterChange}
            style={{ width: "100%" }}
            showSearch
            filterOption={(input, option) => {
              try {
                const data = JSON.parse(option.value);
                return data.name.toLowerCase().includes(input.toLowerCase());
              } catch {
                return false;
              }
            }}
          >
            {semesters.map(semester => (
              <Option 
                key={semester.id || 'all'} 
                value={JSON.stringify({ id: semester.id, name: semester.name })}
              >
                {semester.name}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
            Completion Status
          </label>
          <Select
            value={filters.status}
            onChange={handleStatusChange}
            style={{ width: "100%" }}
          >
            {statuses.map(status => (
              <Option key={status} value={status}>
                {status}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
            Level
          </label>
          <Select
            value={JSON.stringify({ id: currentLevel.id, name: currentLevel.name })}
            onChange={handleLevelChange}
            style={{ width: "100%" }}
            showSearch
            filterOption={(input, option) => {
              try {
                const data = JSON.parse(option.value);
                return data.name.toLowerCase().includes(input.toLowerCase());
              } catch {
                return false;
              }
            }}
          >
            {levels.map(level => (
              <Option 
                key={level.id || 'all'} 
                value={JSON.stringify({ id: level.id, name: level.name })}
              >
                {level.name}
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
            Search
          </label>
          <Input
            placeholder="Search by course code or name..."
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={handleSearchChange}
            allowClear
          />
        </div>
      </div>

      <p style={{ color: "#8c8c8c", margin: 0, fontSize: 14 }}>
        Found <strong>{totalCount}</strong> course(s)
      </p>
    </Card>
  );
}

export default FilterBar;