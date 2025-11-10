import React from "react";
import { Card, Tag, Spin, Empty } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

export default function LecturerClassList({ classes, selectedClass, onSelectClass, semester, loading }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select class</div>
          <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
            {semester?.name}
          </div>
        </div>
      }
      style={{ height: "fit-content" }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin />
        </div>
      ) : classes.length === 0 ? (
        <Empty description="No classes found" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {classes.map((classItem) => (
            <div
              key={classItem.classId}
              onClick={() => onSelectClass(classItem)}
              style={{
                padding: 16,
                border:
                  selectedClass?.classId === classItem.classId
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: 8,
                cursor: "pointer",
                backgroundColor:
                  selectedClass?.classId === classItem.classId ? "#e6f7ff" : "white",
                transition: "all 0.3s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Tag color="blue" style={{ margin: 0 }}>
                  {classItem.classCode || classItem.className}
                </Tag>
                {selectedClass?.classId === classItem.classId && (
                  <Tag color="green" style={{ margin: 0 }}>
                    <CheckCircleOutlined /> Selected
                  </Tag>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {classItem.className}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                {classItem.subjectCode && classItem.subjectName && (
                  <div style={{ marginBottom: 4 }}>
                    <strong>{classItem.subjectCode}</strong> - {classItem.subjectName}
                  </div>
                )}
                {classItem.startDate && classItem.endDate && (
                  <div>
                    {new Date(classItem.startDate).toLocaleDateString('en-GB')} - {new Date(classItem.endDate).toLocaleDateString('en-GB')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
