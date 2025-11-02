import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  Input,
  Space,
  Table,
  Typography,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
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

const ClassAddStudents = () => {
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { pending: notifyPending, success: notifySuccess, error: notifyError } = useNotify();

  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classInfo, setClassInfo] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!classId) {
      return;
    }

    let isMounted = true;
    const loadClassInfo = async () => {
      try {
        const data = await ClassListApi.getStudents(classId);
        if (!isMounted) return;

        const info = {
          classId: data?.classId ?? data?.ClassId ?? classId,
          className: data?.className ?? data?.class_name ?? location.state?.className ?? classId,
          subjectName:
            data?.subject?.subjectName ??
            data?.subject?.SubjectName ??
            data?.subjectName ??
            location.state?.subjectName ??
            "-",
          subjectCode:
            data?.subject?.subjectCode ??
            data?.subject?.SubjectCode ??
            data?.subjectCode ??
            location.state?.subjectCode ??
            "-",
        };
        setClassInfo(info);
      } catch (error) {
        console.error("Failed to load class info", error);
      }
    };

    loadClassInfo();
    return () => {
      isMounted = false;
    };
  }, [classId, location.state?.className, location.state?.subjectCode, location.state?.subjectName]);

  useEffect(() => {
    if (!classId) {
      return;
    }

    let isMounted = true;
    setLoadingCandidates(true);
    ClassListApi.getEligibleStudents(classId)
      .then((data) => {
        if (!isMounted) return;
       const normalized = (data ?? []).map((item, index) => {
         const firstName = item.first_name ?? item.firstName ?? item.FirstName ?? "";
         const lastName = item.last_name ?? item.lastName ?? item.LastName ?? "";
         const fullName =
            item.full_name ??
            item.fullName ??
            [firstName, lastName].filter(Boolean).join(" ").trim();

          const studentIdValue = item.student_id ?? item.studentId ?? null;

          return {
            key: studentIdValue ?? index,
            studentId: studentIdValue ?? "-",
            studentCode: item.student_code ?? item.studentCode ?? "-",
            firstName,
            lastName,
            fullName,
            email: item.email ?? "-",
            avatar: item.avatar ?? null,
          };
        });
        setCandidates(normalized);
      })
      .catch((error) => {
        console.error("Failed to load eligible students", error);
        notifyError(
          "class-eligible-students",
          "Load failed",
          "Unable to load eligible students for this class."
        );
        if (isMounted) {
          setCandidates([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingCandidates(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [classId, notifyError]);

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return candidates;
    }
    return candidates.filter((item) => {
      const values = [
        item.studentCode,
        item.fullName,
        item.firstName,
        item.lastName,
        item.email,
      ];
      return values
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [candidates, searchTerm]);

  const handleSubmit = async () => {
    if (!selectedRowKeys.length) {
      notifyError(
        "class-add-students-empty",
        "No students selected",
        "Please choose at least one student to add."
      );
      return;
    }

    const studentIds = selectedRowKeys
      .map((key) => Number(key))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!studentIds.length) {
      notifyError(
        "class-add-students-invalid",
        "Invalid selection",
        "Selected rows do not contain valid students."
      );
      return;
    }

    const key = `class-add-${classId}`;
    notifyPending(key, "Adding students", "Processing selected students...");
    setSubmitting(true);
    try {
      await ClassListApi.addStudents(classId, studentIds);
      notifySuccess(key, "Students added", "Selected students were added to the class.");
      navigate(`/staffAcademic/class/${classId}/students`, { replace: true });
    } catch (error) {
      console.error("Failed to add students", error);
      const message =
        error?.response?.data?.message ?? error?.message ?? "Unable to add students";
      notifyError(key, "Add failed", message);
    } finally {
      setSubmitting(false);
    }
  };

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
    },
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Avatar",
      dataIndex: "avatar",
      key: "avatar",
      align: "center",
      render: (value, record) => (
        <Avatar src={value} icon={!value ? <UserOutlined /> : undefined} alt={record.fullName} />
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  return (
    <section style={containerStyle}>
      <div style={headerStyle}>
        <Space size={12}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Add Students to Class
          </Typography.Title>
        </Space>
      </div>

      <Card>
        <Space direction="vertical" size={4}>
          <Typography.Text type="secondary">Class Name</Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {classInfo?.className ?? "-"}
          </Typography.Title>
          <Typography.Text type="secondary">
            Subject: {classInfo?.subjectName ?? "-"} ({classInfo?.subjectCode ?? "-"})
          </Typography.Text>
        </Space>
      </Card>

      <Card
        title="Eligible Students"
        extra={
          <Space>
            <Input.Search
              allowClear
              placeholder="Search by name or ID"
              onSearch={setSearchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: 260 }}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!selectedRowKeys.length}
              loading={submitting}
              onClick={handleSubmit}
            >
              Add Selected
            </Button>
          </Space>
        }
      >
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredCandidates}
          loading={loadingCandidates}
          pagination={{ pageSize: 8 }}
          rowKey="key"
          locale={{
            emptyText: loadingCandidates ? "Loading..." : "No eligible students found.",
          }}
        />
      </Card>
    </section>
  );
};

export default ClassAddStudents;
