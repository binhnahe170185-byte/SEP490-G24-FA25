import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Col,
  Row,
  Space,
  Statistic,
  Table,
  Typography,
} from "antd";
import { ArrowLeftOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 16,
  alignItems: "center",
};

const ClassStudents = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { error: notifyError } = useNotify();

  const [loading, setLoading] = useState(true);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!classId) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    ClassListApi.getStudents(classId)
      .then((data) => {
        if (!isMounted) return;

        if (!data) {
          setClassInfo(null);
          setStudents([]);
          return;
        }

        const subject = data.subject ?? data.Subject ?? {};
        const normalizedStudents =
          (data.students ?? data.Students ?? []).map((item, index) => {
            const user = item.user ?? item.User ?? {};
            const firstName = user.firstName ?? user.FirstName ?? item.first_name ?? item.firstName ?? item.FirstName ?? "";
            const lastName = user.lastName ?? user.LastName ?? item.last_name ?? item.lastName ?? item.LastName ?? "";
            const fallbackName = item.full_name ?? item.fullName ?? item.FullName ?? "";
            const fullName =
              ([firstName, lastName].filter(Boolean).join(" ").trim() ||
                fallbackName) ?? "";

            return {
              key:
                item.studentId ??
                item.StudentId ??
                item.studentCode ??
                item.StudentCode ??
                index,
              studentId: item.studentId ?? item.StudentId ?? "-",
              studentCode: item.student_code ?? item.studentCode ?? item.StudentCode ?? "-",
              firstName,
              lastName,
              fullName,
              email: user.email ?? user.Email ?? item.email ?? item.Email ?? "-",
              avatar: user.avatar ?? user.Avatar ?? null,
            };
          });

        setStudents(normalizedStudents);
        setClassInfo({
          classId: data.classId ?? data.ClassId ?? classId,
          className:
            data.className ?? data.class_name ?? data.ClassName ?? classId,
          subjectName:
            subject.subjectName ??
            subject.SubjectName ??
            location.state?.subjectName ??
            "-",
          subjectCode:
            subject.subjectCode ??
            subject.SubjectCode ??
            location.state?.subjectCode ??
            "-",
        });
      })
      .catch((err) => {
        console.error("Failed to load class students", err);
        notifyError(
          "class-students-load",
          "Load failed",
          "Unable to load student list for this class."
        );
        if (isMounted) {
          setClassInfo(null);
          setStudents([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [classId, location.state?.subjectName, location.state?.subjectCode, notifyError]);

  const totalStudents = useMemo(() => students.length, [students]);

  const columns = [
    {
      title: "No.",
      key: "index",
      width: 70,
      align: "center",
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "Student ID",
      dataIndex: "studentCode",
      key: "studentCode",
      render: (value) => value ?? "-",
    },
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
      render: (value) => value ?? "-",
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
      render: (value) => value ?? "-",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
      render: (value) => value ?? "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (value) => value ?? "-",
    },
    {
      title: "Avatar",
      dataIndex: "avatar",
      key: "avatar",
      align: "center",
      render: (value, record) => (
        <Avatar
          src={value}
          icon={!value ? <UserOutlined /> : undefined}
          alt={record.fullName}
        />
      ),
    },
  ];

  return (
    <section style={containerStyle}>
      <div style={headerStyle}>
        <Space size={12}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Class Students
          </Typography.Title>
        </Space>
        {classInfo && (
          <Space>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() =>
                navigate(`/staffAcademic/class/${classInfo.classId}/add-students`, {
                  state: {
                    className: classInfo.className,
                    subjectName: classInfo.subjectName,
                    subjectCode: classInfo.subjectCode,
                  },
                })
              }
            >
              Add students
            </Button>
          </Space>
        )}
      </div>

      <Card>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={6}>
              <Typography.Text type="secondary">Class Name</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {classInfo?.className ?? "-"}
              </Typography.Title>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Space direction="vertical" size={6}>
              <Typography.Text type="secondary">Subject</Typography.Text>
              <Typography.Text strong style={{ fontSize: 18 }}>
                {classInfo?.subjectName ?? "-"}
              </Typography.Text>
              <Typography.Text type="secondary">
                Code: {classInfo?.subjectCode ?? "-"}
              </Typography.Text>
            </Space>
          </Col>
          <Col xs={24} md={6}>
            <Statistic title="Total Students" value={totalStudents} />
          </Col>
        </Row>
      </Card>

      <Card title="Student List">
        <Table
          columns={columns}
          dataSource={students}
          loading={loading}
          rowKey="key"
          pagination={false}
          locale={{
            emptyText: loading
              ? "Loading..."
              : "There are no students in this class.",
          }}
        />
      </Card>
    </section>
  );
};

export default ClassStudents;
