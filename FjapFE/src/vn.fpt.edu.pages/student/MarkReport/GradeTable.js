import React, { useState, useEffect, useCallback } from "react";
import { Card, Table, Tag, Spin, message } from "antd";
import StudentGrades from "../../../vn.fpt.edu.api/StudentGrades";

export default function GradeTable({ course, studentId }) {
  const [gradeDetails, setGradeDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // Wrap loadGradeDetails với useCallback để tránh warning
  const loadGradeDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await StudentGrades.getGradeDetails(studentId, course.courseId);
      setGradeDetails(data);
    } catch (error) {
      console.error("Failed to load grade details:", error);
      message.error("Failed to load grade details");
    } finally {
      setLoading(false);
    }
  }, [studentId, course.courseId]);

  useEffect(() => {
    if (course && studentId) {
      loadGradeDetails();
    }
  }, [course, studentId, loadGradeDetails]);

  const columns = [
    {
      title: "",
      dataIndex: "category",
      key: "category",
      width: 100,
    },
    {
      title: "Grade item",
      dataIndex: "item",
      key: "item",
      width: 150,
    },
    {
      title: "Weight",
      dataIndex: "weight",
      key: "weight",
      align: "center",
      width: 100,
      render: (value) => (value ? `${value} %` : ""),
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      align: "center",
      width: 100,
      render: (text, record) => {
        if (record.item === "Status") {
          let color = "default";
          const statusText = String(text).trim().toLowerCase();
          console.log("Table Status Row Value:", text, statusText);

          if (["passed", "pass", "completed"].includes(statusText)) {
            color = "green";
          } else if (["failed", "fail", "not passed"].includes(statusText)) {
            color = "red";
          }
          return <Tag color={color}>{text}</Tag>;
        }
        return text;
      },
    },
    {
      title: "Comment",
      dataIndex: "comment",
      key: "comment",
      width: 150,
    },
  ];

  const generateGradeData = () => {
    if (!gradeDetails) return [];

    const data = [];

    // Use gradeComponents array from API
    if (gradeDetails.gradeComponents && gradeDetails.gradeComponents.length > 0) {
      gradeDetails.gradeComponents.forEach((component, index) => {
        data.push({
          key: `component-${index}`,
          category: "",
          item: component.componentName,
          weight: component.weight,
          value: component.value,
          comment: component.comment || "",
        });
      });
    }

    // Course total
    if (gradeDetails.average !== null && gradeDetails.average !== undefined) {
      data.push({
        key: "course-average",
        category: "Course total",
        item: "Average",
        weight: "",
        value: gradeDetails.average.toFixed(1),
        comment: "",
      });
    }

    data.push({
      key: "course-status",
      category: "",
      item: "Status",
      weight: "",
      value: gradeDetails.status === "Completed" ? "Passed" : gradeDetails.status,
      comment: "",
    });

    return data;
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (!gradeDetails) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>No grade details available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Grade Report</div>
            {console.log("GradeDetails Status:", gradeDetails.status)}
            <div style={{ fontSize: 14, color: "#595959", fontWeight: 400 }}>
              {gradeDetails.subjectName} ({gradeDetails.subjectCode})
            </div>
          </div>
          <Tag
            color={
              ["passed", "pass", "completed"].includes(String(gradeDetails.status).trim().toLowerCase()) ? "green" :
                ["failed", "fail", "not passed"].includes(String(gradeDetails.status).trim().toLowerCase()) ? "red" :
                  "default"
            }
            style={{ fontSize: 14, padding: "4px 12px" }}
          >
            {gradeDetails.status === "Completed" ? "Passed" : gradeDetails.status}
          </Tag>
        </div>
      }
    >
      <Table
        columns={columns}
        dataSource={generateGradeData()}
        pagination={false}
        bordered
        size="middle"
        rowClassName={(record) => {
          if (record.item === "Total" || record.item === "Average" || record.item === "Status") {
            return "total-row";
          }
          return "";
        }}
      />
      <style>{`
        .total-row {
          background-color: #fafafa !important;
          font-weight: 600;
        }
      `}</style>
    </Card>
  );
}