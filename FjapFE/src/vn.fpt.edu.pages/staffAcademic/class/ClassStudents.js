import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  Modal,
  Tooltip
} from "antd";
import { ArrowLeftOutlined, UserAddOutlined, UserOutlined, DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
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
  const { error: notifyError, success: notifySuccess } = useNotify();
  const [modal, contextHolder] = Modal.useModal();

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

        const subjectSource =
          data.subject ??
          data.Subject ??
          data.subject_detail ??
          data.subjectDetail ??
          data.subjectDetails ??
          (Array.isArray(data.subjects) ? data.subjects[0] : null) ??
          {};
        const subject =
          subjectSource && typeof subjectSource === "object"
            ? subjectSource
            : {};
        const subjectName =
          (typeof subjectSource === "string"
            ? subjectSource
            : null) ??
          subject.subjectName ??
          subject.SubjectName ??
          subject.name ??
          subject.Name ??
          data.subjectName ??
          data.SubjectName ??
          location.state?.subjectName ??
          "-";
        const subjectCode =
          subject.subjectCode ??
          subject.SubjectCode ??
          subject.code ??
          subject.Code ??
          data.subjectCode ??
          data.SubjectCode ??
          data.subject_code ??
          data.Subject_code ??
          data.subjectDetail?.subjectCode ??
          data.subject_detail?.subject_code ??
          location.state?.subjectCode ??
          "-";
        const normalizedStudents =
          (data.students ?? data.Students ?? []).map((item, index) => {
            const user = item.user ?? item.User ?? {};
            const firstName = user.firstName ?? user.FirstName ?? item.first_name ?? item.firstName ?? item.FirstName ?? "";
            const lastName = user.lastName ?? user.LastName ?? item.last_name ?? item.lastName ?? item.LastName ?? "";
            const fallbackName = item.full_name ?? item.fullName ?? item.FullName ?? "";
            const fullName =
              ([firstName, lastName].filter(Boolean).join(" ").trim() ||
                fallbackName) ?? "";

            const avatar =
              user.avatar ??
              user.Avatar ??
              item.avatar ??
              item.Avatar ??
              item.user_avatar ??
              item.userAvatar ??
              null;

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
              avatar,
            };
          });

        setStudents(normalizedStudents);
        setClassInfo({
          classId: data.classId ?? data.ClassId ?? classId,
          className:
            data.className ??
            data.class_name ??
            data.ClassName ??
            location.state?.className ??
            classId,
          subjectName: subjectName,
          subjectCode: subjectCode,
          totalLessons: data.totalLessons ?? 0,
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
  }, [classId, location.state?.className, location.state?.subjectName, location.state?.subjectCode, notifyError]);

  useEffect(() => {
    if (!classId) {
      return;
    }

    const needsSubjectInfo =
      !location.state?.subjectName &&
      (!classInfo?.subjectName || classInfo.subjectName === "-" || !classInfo?.subjectCode || classInfo.subjectCode === "-");

    if (!needsSubjectInfo) {
      return;
    }

    let isMounted = true;

    ClassListApi.getDetail(classId)
      .then((data) => {
        if (!isMounted || !data) return;
        const firstRow = Array.isArray(data) ? data[0] : data;
        if (!firstRow) {
          return;
        }

        const subjectName =
          firstRow.subject_name ??
          firstRow.subjectName ??
          firstRow.subject ??
          firstRow.Subject ??
          classInfo?.subjectName ??
          "-";
        const subjectCode =
          firstRow.subject_code ??
          firstRow.subjectCode ??
          firstRow.code ??
          firstRow.Code ??
          classInfo?.subjectCode ??
          "-";

        setClassInfo((prev) =>
          prev
            ? {
              ...prev,
              subjectName: prev.subjectName === "-" ? subjectName : prev.subjectName ?? subjectName,
              subjectCode: prev.subjectCode === "-" ? subjectCode : prev.subjectCode ?? subjectCode,
            }
            : {
              classId,
              className: location.state?.className ?? classId,
              subjectName,
              subjectCode,
            }
        );
      })
      .catch((error) => {
        console.error("Failed to load class detail for subject info", error);
      });

    return () => {
      isMounted = false;
    };
  }, [classId, classInfo?.subjectName, classInfo?.subjectCode, location.state?.className, location.state?.subjectName, location.state?.subjectCode]);

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
      title: "Action",
      key: "action",
      align: "center",
      render: (_, record) => {
        const hasLessons = (classInfo?.totalLessons ?? 0) > 0;
        return (
          <Tooltip title={hasLessons ? "Cannot remove student: Class in progressing" : "Remove student from class"}>
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={hasLessons}
              onClick={() => handleRemoveStudent(record)}
            />
          </Tooltip>
        );
      },
    },
  ];

  const handleRemoveStudent = (student) => {
    modal.confirm({
      title: "Remove Student",
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to remove student ${student.fullName} (${student.studentCode}) from this class?`,
      okText: "Remove",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await ClassListApi.removeStudent(classId, student.studentId);
          notifySuccess("remove_student", "Success", "Student removed successfully");
          // Update list
          setStudents((prev) => prev.filter((s) => s.studentId !== student.studentId));
        } catch (err) {
          console.error(err);
          notifyError("remove_student_error", "Error", "Failed to remove student");
        }
      },
    });
  };

  return (
    <section style={containerStyle}>
      {contextHolder}
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
              onClick={() => {
                const basePath = location.pathname.startsWith('/headOfAcademic') ? '/headOfAcademic' : '/staffAcademic';
                navigate(`${basePath}/class/${classInfo.classId}/add-students`, {
                  state: {
                    className: classInfo.className,
                    subjectName: classInfo.subjectName,
                    subjectCode: classInfo.subjectCode,
                  },
                });
              }}
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
