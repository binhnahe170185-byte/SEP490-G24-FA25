import React from "react";
import { Card, Empty } from "antd";
import CourseCard from "./CourseCard";

export default function CourseGrid({ courses, userId, onRefresh }) {
  if (courses.length === 0) {
    return (
      <Card style={{ 
        textAlign: "center", 
        padding: 60,
        backgroundColor: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}>
        <Empty 
          description={
            <span style={{ color: "#8c8c8c", fontSize: 16 }}>
              No courses found matching your filters
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", 
      gap: 24,
      "@media (max-width: 768px)": {
        gridTemplateColumns: "1fr"
      }
    }}>
      {courses.map((course) => (
        <CourseCard
          key={course.courseId}
          course={course}
          userId={userId}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}