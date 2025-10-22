import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Spin, message } from "antd";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";

const normalizeLevels = (levels = []) =>
  levels.map((item, index) => ({
    id:
      typeof item === "string" || typeof item === "number"
        ? item
        : item?.id ??
          item?.levelId ??
          item?.level_id ??
          item?.value ??
          `level-${index}`,
    name:
      typeof item === "string" || typeof item === "number"
        ? item.toString()
        : item?.name ?? item?.levelName ?? item?.label ?? `Level ${index + 1}`,
  }));

const normalizeSemesters = (semesters = []) =>
  semesters.map((item, index) => ({
    id:
      typeof item === "string" || typeof item === "number"
        ? item
        : item?.id ??
          item?.semesterId ??
          item?.semester_id ??
          item?.value ??
          `semester-${index}`,
    name:
      typeof item === "string" || typeof item === "number"
        ? item.toString()
        : item?.name ??
          item?.semesterName ??
          item?.semester_name ??
          item?.label ??
          `Semester ${index + 1}`,
  }));

const normalizeSubjects = (subjects = []) =>
  subjects.map((item, index) => {
    const id =
      item?.id ??
      item?.subjectId ??
      item?.subject_id ??
      item?.value ??
      `subject-${index}`;
    const levelId =
      item?.levelId ??
      item?.level_id ??
      item?.level?.id ??
      item?.level?.levelId ??
      null;
    return {
      id,
      name:
        item?.name ??
        item?.subjectName ??
        item?.subject_name ??
        item?.label ??
        `Subject ${index + 1}`,
      levelId,
      levelName:
        item?.levelName ??
        item?.level_name ??
        item?.level?.name ??
        item?.level?.levelName ??
        "-",
    };
  });

const extractSubjectId = (source) => {
  const readValue = (candidate) => {
    if (candidate === null || candidate === undefined || Number.isNaN(candidate)) {
      return undefined;
    }

    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }

    if (typeof candidate === "object") {
      return (
        candidate?.id ??
        candidate?.subjectId ??
        candidate?.subject_id ??
        candidate?.value ??
        undefined
      );
    }

    return undefined;
  };

  if (Array.isArray(source)) {
    for (let index = 0; index < source.length; index += 1) {
      const value = readValue(source[index]);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  return readValue(source);
};

const normalizeClassDetail = (record = {}) => {
  const subjectSource =
    record.subjectIds ??
    record.subject_ids ??
    record.subjects ??
    record.classSubjects ??
    record.subject ??
    record.subjectId ??
    record.subject_id ??
    record.subjectAssignments ??
    [];

  return {
    name:
      record.name ??
      record.className ??
      record.class_name ??
      "",
    semesterId:
      record.semesterId ??
      record.semester_id ??
      record.semester?.id ??
      record.semester?.semesterId ??
      record.semester ??
      record.semesterName ??
      undefined,
    levelId:
      record.levelId ??
      record.level_id ??
      record.level?.id ??
      record.level?.levelId ??
      record.level ??
      record.levelName ??
      undefined,
    subjectId: extractSubjectId(subjectSource),
  };
};

const deriveInitialFormValues = (initialValues = {}) => {
  const subjectSource =
    initialValues.subjectIds ??
    initialValues.subject_ids ??
    initialValues.subjects ??
    initialValues.subject ??
    initialValues.subjectId ??
    initialValues.subject_id ??
    initialValues.classSubjects ??
    initialValues.subjectAssignments ??
    [];
  const subjectId = extractSubjectId(subjectSource);

  return {
    name:
      initialValues.name ??
      initialValues.className ??
      initialValues.class_name ??
      "",
    semesterId:
      initialValues.semesterId ??
      initialValues.semester_id ??
      initialValues.semester?.id ??
      initialValues.semester?.semesterId ??
      initialValues.semester ??
      initialValues.semesterName ??
      undefined,
    levelId:
      initialValues.levelId ??
      initialValues.level_id ??
      initialValues.level?.id ??
      initialValues.level?.levelId ??
      initialValues.level ??
      initialValues.levelName ??
      undefined,
    subjectId: subjectId ?? undefined,
  };
};

export default function ClassFormModal({
  open,
  mode = "create",
  classId,
  initialValues = {},
  onCancel,
  onSuccess,
  fallbackLevels = [],
  fallbackSemesters = [],
}) {
  const [form] = Form.useForm();
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [options, setOptions] = useState({
    levels: [],
    semesters: [],
    subjects: [],
  });
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(undefined);

  const isEditMode = mode === "edit";

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingOptions(true);
    ClassListApi.getFormOptions()
      .then((data) => {
        const normalizedLevels = normalizeLevels(
          data?.levels ?? data?.levelOptions ?? []
        );
        const normalizedSemesters = normalizeSemesters(
          data?.semesters ?? data?.semesterOptions ?? []
        );
        const normalizedSubjects = normalizeSubjects(
          data?.subjects ?? data?.subjectOptions ?? []
        );

        setOptions({
          levels:
            normalizedLevels.length > 0
              ? normalizedLevels
              : normalizeLevels(fallbackLevels),
          semesters:
            normalizedSemesters.length > 0
              ? normalizedSemesters
              : normalizeSemesters(fallbackSemesters),
          subjects: normalizedSubjects,
        });
      })
      .catch((error) => {
        console.error("Failed to load class form options:", error);
        setOptions({
          levels: normalizeLevels(fallbackLevels),
          semesters: normalizeSemesters(fallbackSemesters),
          subjects: [],
        });
        message.error("Unable to load form options");
      })
      .finally(() => setLoadingOptions(false));
  }, [open, fallbackLevels, fallbackSemesters]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const derived = deriveInitialFormValues(initialValues);
    form.setFieldsValue(derived);
    setCurrentLevel(derived.levelId);
  }, [open, initialValues, form]);

  useEffect(() => {
    if (!open || !isEditMode || !classId) {
      return;
    }

    setLoadingRecord(true);
    ClassListApi.getById(classId)
      .then((data) => {
        const normalized = normalizeClassDetail(data ?? {});
        form.setFieldsValue(normalized);
        setCurrentLevel(normalized.levelId);
      })
      .catch((error) => {
        console.error("Failed to load class detail:", error);
        message.error("Unable to load class details");
        onCancel?.();
      })
      .finally(() => setLoadingRecord(false));
  }, [open, isEditMode, classId, form, onCancel]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentLevel(undefined);
      setSubmitting(false);
      setLoadingRecord(false);
    }
  }, [open, form]);

  const filteredSubjects = useMemo(() => {
    if (!currentLevel) {
      return [];
    }
    return options.subjects.filter((item) => {
      if (!item.levelId) {
        return false;
      }
      return String(item.levelId) === String(currentLevel);
    });
  }, [currentLevel, options.subjects]);

  const isLoading = loadingOptions || loadingRecord;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const trimmedName = values.name.trim();
      if (!trimmedName) {
        form.setFields([
          {
            name: "name",
            errors: ["Class name cannot be empty"],
          },
        ]);
        return;
      }

      if (isEditMode && !classId) {
        message.error("Missing class identifier");
        return;
      }

      const subjectIdValue = Number(values.subjectId);
      const levelIdValue = Number(values.levelId);
      const semesterIdValue = Number(values.semesterId);

      if (Number.isNaN(subjectIdValue)) {
        message.error("Selected subject is invalid");
        return;
      }

      if (Number.isNaN(levelIdValue) || Number.isNaN(semesterIdValue)) {
        message.error("Selected level or semester is invalid");
        return;
      }

      const payload = {
        className: trimmedName,
        semesterId: semesterIdValue,
        levelId: levelIdValue,
        subjectId: subjectIdValue,
      };

      if (isEditMode && classId) {
        const numericId = Number(classId);
        if (Number.isNaN(numericId)) {
          message.error("Class identifier is invalid");
          return;
        }
        payload.classId = numericId;
      }

      setSubmitting(true);
      if (isEditMode && classId) {
        await ClassListApi.update(classId, payload);
        message.success("Class updated successfully");
      } else {
        await ClassListApi.create(payload);
        message.success("Class created successfully");
      }
      onSuccess?.(payload);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      console.error("Class form submission failed:", error);
      const errorMessage =
        error?.response?.data?.message ??
        error?.message ??
        "Unable to save class";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLevelChange = (value) => {
    setCurrentLevel(value);
    form.setFieldsValue({ subjectId: undefined });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={isEditMode ? "Update Class" : "Create Class"}
      cancelText="Cancel"
      confirmLoading={submitting}
      destroyOnClose
      title={isEditMode ? "Edit Class" : "Create Class"}
      okButtonProps={{ disabled: isLoading }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Spin />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          initialValues={deriveInitialFormValues(initialValues)}
        >
          <Form.Item
            label="Tên lớp"
            name="name"
            rules={[
              { required: true, message: "Vui lòng nhập tên lớp" },
              {
                max: 120,
                message: "Tên lớp không được vượt quá 120 ký tự",
              },
            ]}
          >
            <Input placeholder="Enter class name" />
          </Form.Item>

          <Form.Item
            label="Level"
            name="levelId"
            rules={[{ required: true, message: "Please select a level" }]}
          >
            <Select
              placeholder="Select level"
              options={options.levels.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={handleLevelChange}
            />
          </Form.Item>

          <Form.Item
            label="Semester"
            name="semesterId"
            rules={[{ required: true, message: "Please select a semester" }]}
          >
            <Select
              placeholder="Select semester"
              options={options.semesters.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Assign Subject"
            name="subjectId"
            rules={[
              {
                required: true,
                message: "Please choose a subject",
              },
            ]}
          >
            <Select
              placeholder={
                currentLevel
                  ? "Select a subject under the chosen level"
                  : "Select a level before picking a subject"
              }
              disabled={!currentLevel}
              options={filteredSubjects.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
