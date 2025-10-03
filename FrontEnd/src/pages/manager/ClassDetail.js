import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, Space, Table, Tooltip } from "antd";
import {
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import ClassListApi from "../../api/ClassList";

const wrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
};

const headingStyle = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
};

const tableCardStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 0,
  overflow: "hidden",
  background: "#f8fafc",
};

export default function ClassDetail() {
  const { classId } = useParams();
  const location = useLocation();
  const initialClassName = (location.state && location.state.className) || classId;

  const [className, setClassName] = useState(initialClassName);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    ClassListApi.getDetail(classId)
      .then((data) => {
        if (!isMounted) return;
        const rows = data ?? [];
        setSubjects(rows);
        if (rows.length > 0 && !location.state?.className) {
          setClassName(rows[0].class_name ?? initialClassName);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSubjects([]);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [classId, initialClassName, location.state?.className]);

  const handleViewStudents = (record) => {
    console.log("View students", record);
  };

  const handleImportStudents = (record) => {
    console.log("Import students", record);
  };

  const handleAddStudent = (record) => {
    console.log("Add student", record);
  };

  const columns = [
    {
      title: "Subject",
      dataIndex: "subject_name",
      key: "subject_name",
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: "Level",
      dataIndex: "subject_level",
      key: "subject_level",
    },
    {
      title: "Students",
      dataIndex: "total_students",
      key: "total_students",
      align: "right",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View students">
            <Button
              icon={<TeamOutlined />}
              onClick={() => handleViewStudents(record)}
            />
          </Tooltip>
          <Tooltip title="Import students">
            <Button
              icon={<UploadOutlined />}
              onClick={() => handleImportStudents(record)}
            />
          </Tooltip>
          <Tooltip title="Add student">
            <Button
              icon={<UserAddOutlined />}
              onClick={() => handleAddStudent(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <section style={wrapperStyle}>
      <header>
        <h1 style={headingStyle}>Class Detail</h1>
        <p style={{ marginTop: 4, color: "#64748b" }}>
          You are viewing information for class <strong>{className}</strong>.
        </p>
      </header>

      <article style={tableCardStyle}>
        <Table
          columns={columns}
          dataSource={subjects}
          loading={loading}
          rowKey={(record) => `${record.class_id}-${record.subject_name}`}
          pagination={false}
          bordered
          style={{ background: "#fff" }}
          locale={{
            emptyText: loading
              ? ""
              : "No subject information available for this class.",
          }}
        />
      </article>

      <div>
        <Link to="/manager/class" style={{ color: "#2563eb" }}>
          ← Back to class list
        </Link>
      </div>
    </section>
  );
}
