// GradeManage/FilterBar.js
import React from "react";
import { Card, Select, Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

const semesters = ["All Semesters", "Summer 2025", "Spring 2025", "Fall 2024", "Summer 2024"];
const statuses = ["All Status", "100% Complete", "In Progress", "Not Started"];
const levels = ["All Levels", "Undergraduate", "Graduate", "Postgraduate"];

function FilterBar({ filters, onFilterChange, totalCount }) {
  const handleChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
            Semester
          </label>
          <Select
            value={filters.semester}
            onChange={(value) => handleChange("semester", value)}
            style={{ width: "100%" }}
          >
            {semesters.map(semester => (
              <Option key={semester} value={semester}>
                {semester}
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
            onChange={(value) => handleChange("status", value)}
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
            value={filters.level}
            onChange={(value) => handleChange("level", value)}
            style={{ width: "100%" }}
          >
            {levels.map(level => (
              <Option key={level} value={level}>
                {level}
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
            onChange={(e) => handleChange("search", e.target.value)}
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

export default FilterBar; // ✅ Phải có dòng này