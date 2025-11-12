import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Spin } from "antd";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";

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

const toDateInstance = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const derived = value.toDate();
      if (derived instanceof Date && !Number.isNaN(derived.getTime())) {
        return derived;
      }
    }

    if (
      typeof value.year === "number" &&
      typeof value.month === "number" &&
      typeof value.day === "number"
    ) {
      const derived = new Date(value.year, value.month - 1, value.day);
      return Number.isNaN(derived.getTime()) ? null : derived;
    }

    if ("seconds" in value || "nanoseconds" in value) {
      const seconds = typeof value.seconds === "number" ? value.seconds : 0;
      const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
      const derived = new Date(seconds * 1000 + nanos / 1e6);
      return Number.isNaN(derived.getTime()) ? null : derived;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const derived = new Date(value);
    return Number.isNaN(derived.getTime()) ? null : derived;
  }

  return null;
};

const normalizeSemesters = (semesters = []) =>
  semesters.map((item, index) => {
    const startSource =
      item?.startDate ??
      item?.start_date ??
      item?.semesterStart ??
      item?.semester_start ??
      item?.semesterStartDate ??
      item?.semester_start_date ??
      null;
    const endSource =
      item?.endDate ??
      item?.end_date ??
      item?.semesterEnd ??
      item?.semester_end ??
      item?.semesterEndDate ??
      item?.semester_end_date ??
      null;

    return {
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
      startDate: toDateInstance(startSource),
      endDate: toDateInstance(endSource),
    };
  });

const isSemesterCurrentOrUpcoming = (semester, referenceDate = new Date()) => {
  const { startDate, endDate } = semester;
  if (endDate instanceof Date && !Number.isNaN(endDate.getTime())) {
    return endDate.getTime() >= referenceDate.getTime();
  }
  if (startDate instanceof Date && !Number.isNaN(startDate.getTime())) {
    return startDate.getTime() >= referenceDate.getTime();
  }
  return true;
};

const filterUpcomingSemesters = (semesters = [], referenceDate = new Date()) =>
  semesters.filter((semester) =>
    isSemesterCurrentOrUpcoming(semester, referenceDate)
  );

const ensureSemesterOptionVisible = (
  semesters = [],
  currentSemesterId,
  currentSemesterName
) => {
  if (
    currentSemesterId === null ||
    currentSemesterId === undefined ||
    currentSemesterId === ""
  ) {
    return semesters;
  }

  const normalizedId = currentSemesterId.toString();
  const alreadyExists = semesters.some(
    (semester) => semester?.id?.toString() === normalizedId
  );

  if (alreadyExists) {
    return semesters;
  }

  return [
    ...semesters,
    {
      id: currentSemesterId,
      name: currentSemesterName ?? `Semester ${normalizedId}`,
      startDate: null,
      endDate: null,
    },
  ];
};

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

  const readSemesterName = () => {
    const explicitName =
      initialValues.semesterName ??
      initialValues.semester_name ??
      initialValues.semesterLabel ??
      initialValues.semester_label ??
      undefined;
    if (explicitName) {
      return explicitName;
    }

    const readFrom = (source) => {
      if (!source) {
        return undefined;
      }
      if (typeof source === "string") {
        return source;
      }
      if (typeof source === "object") {
        return (
          source.name ??
          source.semesterName ??
          source.semester_name ??
          source.label ??
          undefined
        );
      }
      return undefined;
    };

    return (
      readFrom(initialValues.semester) ??
      readFrom(initialValues.semesterDetail ?? initialValues.semester_detail) ??
      undefined
    );
  };

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
    semesterName: readSemesterName(),
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
  const { pending: notifyPending, success: notifySuccess, error: notifyError } =
    useNotify();
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
  const derivedInitialValues = useMemo(
    () => deriveInitialFormValues(initialValues),
    [initialValues]
  );

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
        const filteredSemesters = ensureSemesterOptionVisible(
          filterUpcomingSemesters(normalizedSemesters),
          derivedInitialValues.semesterId,
          derivedInitialValues.semesterName
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
            filteredSemesters.length > 0
              ? filteredSemesters
              : ensureSemesterOptionVisible(
                  filterUpcomingSemesters(normalizeSemesters(fallbackSemesters)),
                  derivedInitialValues.semesterId,
                  derivedInitialValues.semesterName
                ),
          subjects: normalizedSubjects,
        });
      })
      .catch((error) => {
        console.error("Failed to load class form options:", error);
        setOptions({
          levels: normalizeLevels(fallbackLevels),
          semesters: ensureSemesterOptionVisible(
            filterUpcomingSemesters(normalizeSemesters(fallbackSemesters)),
            derivedInitialValues.semesterId,
            derivedInitialValues.semesterName
          ),
          subjects: [],
        });
        notifyError(
          "class-form-load-options",
          "Load failed",
          "Unable to load class form options."
        );
      })
      .finally(() => setLoadingOptions(false));
  }, [
    open,
    fallbackLevels,
    fallbackSemesters,
    notifyError,
    derivedInitialValues.semesterId,
    derivedInitialValues.semesterName,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue(derivedInitialValues);
    setCurrentLevel(derivedInitialValues.levelId);
  }, [open, derivedInitialValues, form]);

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
        notifyError(
          `class-form-load-${classId}`,
          "Load failed",
          "Unable to load class details."
        );
        onCancel?.();
      })
      .finally(() => setLoadingRecord(false));
  }, [open, isEditMode, classId, form, onCancel, notifyError]);

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
    let notifyKey = null;
    const actionType = isEditMode ? "update" : "create";
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
        notifyError(
          "class-update-missing-id",
          "Update failed",
          "Class identifier is missing."
        );
        return;
      }

      const subjectIdValue = Number(values.subjectId);
      const levelIdValue = Number(values.levelId);
      const semesterIdValue = Number(values.semesterId);

      if (Number.isNaN(subjectIdValue)) {
        notifyError(
          "class-form-invalid-subject",
          "Invalid subject",
          "Please choose a valid subject."
        );
        return;
      }

      if (Number.isNaN(levelIdValue) || Number.isNaN(semesterIdValue)) {
        notifyError(
          "class-form-invalid-level",
          "Invalid selection",
          "Please choose a valid level and semester."
        );
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
          notifyError(
            "class-update-invalid-id",
            "Update failed",
            "Class identifier is invalid."
          );
          return;
        }
        payload.classId = numericId;
      }

      notifyKey = `class-${actionType}-${isEditMode ? classId : Date.now()}`;
      notifyPending(
        notifyKey,
        isEditMode ? "Updating class" : "Creating class",
        `Processing ${trimmedName}...`
      );

      setSubmitting(true);
      if (isEditMode && classId) {
        await ClassListApi.update(classId, payload);
        notifySuccess(
          notifyKey,
          "Class updated",
          `${trimmedName} updated successfully.`
        );
      } else {
        await ClassListApi.create(payload);
        notifySuccess(
          notifyKey,
          "Class created",
          `${trimmedName} created successfully.`
        );
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
      notifyError(
        notifyKey ?? `class-${actionType}-error`,
        "Save failed",
        errorMessage
      );
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
            label="Class Name"
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
