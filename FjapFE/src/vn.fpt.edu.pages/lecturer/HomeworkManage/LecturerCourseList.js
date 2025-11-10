import React from "react";
import { Card, Tag, Spin, Empty } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

export default function LecturerCourseList({ courses, selectedCourse, onSelectCourse, selectedClass, loading }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select course</div>
          <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
            {selectedClass?.className || "Select a class first"}
          </div>
        </div>
      }
      style={{ height: "fit-content" }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin />
        </div>
      ) : courses.length === 0 ? (
        <Empty description="No courses found" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courses.map((course) => (
            <div
              key={course.courseId}
              onClick={() => onSelectCourse(course)}
              style={{
                padding: 16,
                border:
                  selectedCourse?.courseId === course.courseId
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: 8,
                cursor: "pointer",
                backgroundColor:
                  selectedCourse?.courseId === course.courseId ? "#e6f7ff" : "white",
                transition: "all 0.3s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18, marginRight: 4 }}>&lt;&gt;</span>
                <Tag color="blue" style={{ margin: 0 }}>
                  {course.subjectCode}
                </Tag>
                {selectedCourse?.courseId === course.courseId && (
                  <Tag color="green" style={{ margin: 0 }}>
                    <CheckCircleOutlined /> Selected
                  </Tag>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {course.subjectName}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                <div>{course.className} - {course.classCode}</div>
                {course.startDate && course.endDate && (
                  <div>
                    {new Date(course.startDate).toLocaleDateString('en-GB')} - {new Date(course.endDate).toLocaleDateString('en-GB')}
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
