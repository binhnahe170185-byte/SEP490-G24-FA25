import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, Input, Space, Table, Tooltip } from "antd";
import {
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList"

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

const filterBarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
  padding: "16px 16px 0",
};

export default function ClassDetail() {
  const { classId } = useParams();
  const location = useLocation();
  const initialClassName = (location.state && location.state.className) || classId;

  const [className, setClassName] = useState(initialClassName);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const normalizeSubjects = (rows = []) =>
    rows.map((item, index) => {
      const subjectId = item.subject_id ?? item.subjectId ?? index;
      const levelName =
        item.level_name ??
        item.levelName ??
        (item.subject_level !== undefined && item.subject_level !== null
          ? item.subject_level.toString()
          : "-");
      return {
        key: subjectId ?? `${classId}-${index}`,
        class_id: item.class_id ?? item.classId ?? classId,
        class_name: item.class_name ?? item.className ?? className,
        subject_id: subjectId,
        subject_code: item.subject_code ?? item.subjectCode ?? "-",
        subject_name: item.subject_name ?? item.subjectName ?? "-",
        subject_level: item.subject_level ?? item.subjectLevel ?? null,
        level_name: levelName,
        lecture_name: item.lecture_name ?? item.lectureName ?? "-",
        lecture_email: item.lecture_email ?? item.lectureEmail ?? null,
        lecture_mail: item.lecture_email ?? item.lectureEmail ?? null,
        total_students: item.total_students ?? item.totalStudents ?? 0,
      };
    });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    ClassListApi.getDetail(classId)
      .then((data) => {
        if (!isMounted) return;
        const rows = Array.isArray(data) ? data : [];
        const normalized = normalizeSubjects(rows);
        setSubjects(normalized);
        if (normalized.length > 0 && !location.state?.className) {
          setClassName(normalized[0].class_name ?? initialClassName);
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

  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return subjects.filter((item) => {
      if (!term) {
        return true;
      }

      const candidates = [
        item.subject_name,
        item.subject_code,
        item.level_name,
        item.lecture_name,
        item.lecture_email,
      ];

      return candidates
        .filter(Boolean)
        .some((value) =>
          value.toString().toLowerCase().includes(term)
        );
    });
  }, [subjects, searchTerm]);

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
      title: "Subject Code",
      dataIndex: "subject_code",
      key: "subject_code",
      render: (value) => value ?? "-",
    },
    {
      title: "Level",
      dataIndex: "level_name",
      key: "level_name",
      render: (value, record) =>
        value ?? record.subject_level ?? "-",
    },
    {
      title: "Lecture",
      dataIndex: "lecture_name",
      key: "lecture_name",
      render: (value, record) =>
        value ? (
          record.lecture_email ? (
            <Tooltip title={record.lecture_email}>{value}</Tooltip>
          ) : (
            value
          )
        ) : (
          "-"
        ),
    },
    {
      title: "Lecturer Email",
      dataIndex: "lecture_email",
      key: "lecture_email",
      render: (value) => value ?? "-",
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
        <div style={filterBarStyle}>
          <Input
            allowClear
            placeholder="Search subjects or lecturers..."
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ minWidth: 220, maxWidth: 340 }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredSubjects}
          loading={loading}
          rowKey={(record) =>
            record.subject_id ?? `${record.class_id}-${record.subject_name}`
          }
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
