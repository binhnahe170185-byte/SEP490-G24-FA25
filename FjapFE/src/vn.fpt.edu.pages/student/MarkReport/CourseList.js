import React from "react";
import { Card, Tag, Spin, Empty } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

export default function CourseList({ courses, selectedCourse, onSelectCourse, semester, loading }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select course</div>
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
      ) : courses.length === 0 ? (
        <Empty description="No courses available" />
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
                <Tag color="blue" style={{ margin: 0 }}>
                  {course.subjectCode}
                </Tag>
                <Tag 
                  color={
                    course.gradeStatus === "Completed" || course.gradeStatus === "Passed" ? "success" : 
                    course.gradeStatus === "Failed" ? "error" : 
                    "default"
                  } 
                  style={{ margin: 0 }}
                >
                  {course.gradeStatus === "Completed" ? "Passed" : course.gradeStatus}
                </Tag>
                {selectedCourse?.courseId === course.courseId && course.status === "Showing" && (
                  <Tag color="green" style={{ margin: 0 }}>
                    <CheckCircleOutlined /> {course.status}
                  </Tag>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {course.subjectName}
              </div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                <div>👥 {course.className} - {course.classCode}</div>
                <div>📊 Average: {course.average !== null && course.average !== undefined ? course.average.toFixed(1) : "N/A"}</div>
                {course.startDate && course.endDate && (
                  <div>📅 {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}