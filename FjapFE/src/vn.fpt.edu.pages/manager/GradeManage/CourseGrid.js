import React from "react";
import { Card, Empty } from "antd";
import CourseCard from "./CourseCard";

export default function CourseGrid({ courses, userId, onRefresh }) {
  if (courses.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: 40 }}>
        <Empty 
          description="No courses found matching your filters"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
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