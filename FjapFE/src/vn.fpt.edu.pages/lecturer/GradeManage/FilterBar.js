import React, { useState, useEffect } from "react";
import { Card, Select, Input, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { api } from "../../../vn.fpt.edu.api/http";

const { Option } = Select;

const statuses = ["All Status", "100% Complete", "In Progress", "Not Started"];

function FilterBar({ filters, onFilterChange, totalCount, isLecturer = false }) {
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
  const currentLevel = levels.find(l => l.name === filters.level) || levels[0];

  return (
    <Card style={{ 
      marginBottom: 24,
      backgroundColor: "#fff",
      borderRadius: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
    }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isLecturer ? "repeat(2, 1fr)" : "repeat(3, 1fr)", 
        gap: 16, 
        marginBottom: 16 
      }}>
        {!isLecturer && (
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
        )}

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

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: 12,
        borderTop: "1px solid #f0f0f0"
      }}>
        <p style={{ color: "#8c8c8c", margin: 0, fontSize: 14 }}>
          Found <strong style={{ color: "#262626", fontSize: 16 }}>{totalCount}</strong> course{totalCount !== 1 ? 's' : ''}
        </p>
        {isLecturer && (
          <span style={{ 
            fontSize: 12, 
            color: "#52c41a",
            padding: "4px 12px",
            backgroundColor: "#f6ffed",
            borderRadius: 4
          }}>
            ✓ Showing only Active classes
          </span>
        )}
      </div>
    </Card>
  );
}

export default FilterBar;