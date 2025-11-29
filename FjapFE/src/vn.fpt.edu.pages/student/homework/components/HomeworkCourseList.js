import React from "react";
import { Card, Tag, Spin, Empty } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

const statusColorMap = {
  studying: "blue",
  learning: "blue",
  ongoing: "geekblue",
  completed: "green",
  passed: "green",
  failed: "red",
};

const getStatusColor = (status) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  return statusColorMap[normalized] || "default";
};

const formatDateRange = (start, end) => {
  if (!start && !end) return null;
  const format = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-GB");
  };
  const startStr = format(start);
  const endStr = format(end);
  if (startStr && endStr) return `${startStr} - ${endStr}`;
  return startStr || endStr;
};

const HomeworkCourseList = ({
  courses,
  selectedCourse,
  onSelectCourse,
  semester,
  loading,
}) => {
  return (
    <Card
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Select subject</div>
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
        <Empty description="No courses in this semester" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {courses.map((course) => {
            const isSelected = selectedCourse?.courseId === course.courseId;
            const statusColor = getStatusColor(course.status || course.gradeStatus);
            return (
              <div
                key={course.courseId}
                onClick={() => onSelectCourse(course)}
                style={{
                  padding: 16,
                  border: isSelected ? "2px solid #1890ff" : "1px solid #d9d9d9",
                  borderRadius: 8,
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#e6f7ff" : "white",
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {course.subjectCode && (
                    <Tag color="blue" style={{ margin: 0 }}>
                      {course.subjectCode}
                    </Tag>
                  )}
                  {course.status || course.gradeStatus ? (
                    <Tag color={statusColor} style={{ margin: 0 }}>
                      {(course.status || course.gradeStatus) === "Completed"
                        ? "Passed"
                        : course.status || course.gradeStatus}
                    </Tag>
                  ) : null}
                  {isSelected && (
                    <Tag color="green" style={{ margin: 0 }}>
                      <CheckCircleOutlined /> Selected
                    </Tag>
                  )}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {course.subjectName || course.courseName || "Unnamed subject"}
                </div>
                <div style={{ fontSize: 12, color: "#8c8c8c", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div>👥 {course.className || course.classCode}</div>
                  {course.lecturerName && <div>👨‍🏫 {course.lecturerName}</div>}
                  {formatDateRange(course.startDate, course.endDate) && (
                    <div>📅 {formatDateRange(course.startDate, course.endDate)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default HomeworkCourseList;

