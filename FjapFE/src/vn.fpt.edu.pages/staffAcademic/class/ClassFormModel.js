import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Form, Input, Modal, Select, Spin, InputNumber, Alert } from "antd";
import ClassListApi from "../../../vn.fpt.edu.api/ClassList";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";
import SemesterApi from "../../../vn.fpt.edu.api/Semester";

const extractLevelCode = (raw) => {
  if (!raw) {
    return "";
  }
  if (typeof raw === "string") {
    const match = raw.match(/N\d+/i);
    if (match) {
      return match[0].toUpperCase();
    }
    return raw.replace(/\s+/g, "").toUpperCase();
  }
  if (typeof raw === "object") {
    return (
      raw.code ??
      raw.levelCode ??
      extractLevelCode(raw.name ?? raw.levelName ?? raw.label ?? "")
    );
  }
  return raw.toString().toUpperCase();
};

const normalizeLevels = (levels = []) =>
  levels.map((item, index) => {
    const id =
      typeof item === "string" || typeof item === "number"
        ? item
        : item?.id ??
        item?.levelId ??
        item?.level_id ??
        item?.value ??
        `level-${index}`;
    const name =
      typeof item === "string" || typeof item === "number"
        ? item.toString()
        : item?.name ?? item?.levelName ?? item?.label ?? `Level ${index + 1}`;
    return {
      id,
      name,
      code: extractLevelCode(item?.code ?? item?.levelCode ?? name),
    };
  });



const toUpperTrimmed = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return value.toString().trim().toUpperCase();
};

const deriveSeasonalCode = (value) => {
  if (!value) {
    return "";
  }
  const normalized = value.toString().trim();
  if (!normalized) {
    return "";
  }
  const uppercase = normalized.toUpperCase();
  const seasonMap = {
    SPRING: "SP",
    SUMMER: "SU",
    FALL: "FA",
    AUTUMN: "AU",
    WINTER: "WI",
  };
  let prefix = "";
  for (const [season, code] of Object.entries(seasonMap)) {
    if (uppercase.includes(season)) {
      prefix = code;
      break;
    }
  }
  if (!prefix) {
    const lettersOnly = uppercase.replace(/[^A-Z]/g, "");
    prefix = lettersOnly.slice(0, 2);
  }
  const yearMatch = normalized.match(/(19|20)?\d{2}/g);
  let yearSuffix = "";
  if (yearMatch && yearMatch.length > 0) {
    const last = yearMatch[yearMatch.length - 1];
    yearSuffix = last.length > 2 ? last.slice(-2) : last;
  }
  return `${prefix}${yearSuffix}`.trim();
};

const extractSemesterCode = (raw) => {
  if (!raw) {
    return "";
  }
  if (typeof raw === "string" || typeof raw === "number") {
    const normalized = raw.toString().trim();
    const match = normalized.match(/[A-Za-z]{2}\d{2}/);
    if (match) {
      return match[0].toUpperCase();
    }
    const seasonal = deriveSeasonalCode(normalized);
    if (seasonal) {
      return seasonal;
    }
    return normalized.replace(/\s+/g, "").toUpperCase();
  }
  if (typeof raw === "object") {
    const directCandidate =
      raw.code ??
      raw.Code ??
      raw.semesterCode ??
      raw.semester_code ??
      raw.SemesterCode ??
      raw.semesterShortName ??
      raw.semester_short_name ??
      raw.semesterShortCode ??
      raw.semester_short_code ??
      null;
    if (directCandidate) {
      return toUpperTrimmed(directCandidate);
    }
    const nestedSources = [
      raw.semester,
      raw.Semester,
      raw.semesterDetail,
      raw.semester_detail,
      raw.detail,
      raw.data,
      raw.metadata,
    ];
    for (const source of nestedSources) {
      const nested = extractSemesterCode(source);
      if (nested) {
        return nested;
      }
    }
    return extractSemesterCode(
      raw.name ??
      raw.Name ??
      raw.semesterName ??
      raw.semester_name ??
      raw.label ??
      raw.semesterLabel ??
      raw.semester_label ??
      ""
    );
  }
  return raw.toString().toUpperCase();
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

    const name =
      typeof item === "string" || typeof item === "number"
        ? item.toString()
        : item?.name ??
        item?.semesterName ??
        item?.semester_name ??
        item?.label ??
        `Semester ${index + 1}`;
    const code =
      extractSemesterCode(item) || extractSemesterCode(name) || "";
    return {
      id:
        typeof item === "string" || typeof item === "number"
          ? item
          : item?.id ??
          item?.semesterId ??
          item?.semester_id ??
          item?.value ??
          `semester-${index}`,
      name,
      code,
      startDate: startSource ? dayjs(startSource) : null,
      endDate: endSource ? dayjs(endSource) : null,
    };
  });

const isSemesterFuture = (semester, referenceDate = dayjs()) => {
  const { startDate } = semester;
  const startObj = dayjs(startDate);
  if (startObj.isValid()) {
    // Strict future check: Semester must start after the reference date
    return startObj.isAfter(referenceDate, "day") || startObj.isSame(referenceDate, "day");
  }
  return false;
};

const filterFutureSemesters = (semesters = [], referenceDate = dayjs()) =>
  semesters.filter((semester) =>
    isSemesterFuture(semester, referenceDate)
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
      code: extractSemesterCode(currentSemesterName ?? normalizedId),
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
    const name =
      item?.name ??
      item?.subjectName ??
      item?.subject_name ??
      item?.label ??
      `Subject ${index + 1}`;
    return {
      id,
      name,
      code:
        item?.code ??
        item?.subjectCode ??
        item?.subject_code ??
        name.replace(/\s+/g, "").toUpperCase(),
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

  // Calculate total students in class - use API field if available, fallback to students array length
  const totalStudents = record.totalStudents ?? record.students?.length ?? 0;

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
    minStudents: record.minStudents ?? record.min_students ?? undefined,
    maxStudents: record.maxStudents ?? record.max_students ?? undefined,
    totalStudents: totalStudents,
  };
};

const toComparableId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric.toString();
  }
  return value.toString();
};

const normalizeExistingClasses = (records = []) =>
  (records ?? [])
    .map((record = {}) => {
      const normalized = normalizeClassDetail(record);
      const className =
        record.className ??
        record.class_name ??
        record.name ??
        normalized.name ??
        "";
      const classIdValue =
        record.classId ??
        record.class_id ??
        record.id ??
        record.ClassId ??
        null;
      const semesterId =
        normalized.semesterId ??
        record.semesterId ??
        record.semester_id ??
        record.semester?.id ??
        record.semester?.semesterId ??
        record.semester_detail?.semesterId ??
        record.semester_detail?.semester_id ??
        null;
      const levelId =
        normalized.levelId ??
        record.levelId ??
        record.level_id ??
        record.level?.id ??
        record.level?.levelId ??
        record.level_detail?.levelId ??
        record.level_detail?.level_id ??
        null;
      const subjectId =
        normalized.subjectId ??
        record.subjectId ??
        record.subject_id ??
        record.subject?.id ??
        record.subject?.subjectId ??
        record.subject_detail?.subjectId ??
        record.subject_detail?.subject_id ??
        null;
      return {
        classId: toComparableId(classIdValue),
        className,
        semesterId: toComparableId(semesterId),
        levelId: toComparableId(levelId),
        subjectId: toComparableId(subjectId),
      };
    })
    .filter(
      (item) => item.className && item.semesterId && item.levelId && item.subjectId
    );

const buildSemesterCodeMap = (list = []) => {
  const map = new Map();
  (list ?? []).forEach((item) => {
    const semesterId =
      item?.semesterId ??
      item?.SemesterId ??
      item?.id ??
      item?.Id ??
      item?.value ??
      item?.semester_id ??
      null;
    const codeSource =
      item?.semesterCode ??
      item?.semester_code ??
      item?.code ??
      item?.Code ??
      item?.shortName ??
      item?.short_name ??
      item?.semesterShortName ??
      item?.semester_short_name ??
      item?.semesterShortCode ??
      item?.semester_short_code ??
      null;
    const inferredCode =
      codeSource ??
      deriveSeasonalCode(
        item?.name ??
        item?.semesterName ??
        item?.semester_name ??
        item?.label ??
        ""
      );
    if (semesterId && inferredCode) {
      map.set(toComparableId(semesterId), toUpperTrimmed(inferredCode));
    }
  });
  return map;
};

const applySemesterCodes = (semesters = [], codeMap = new Map()) =>
  semesters.map((item) => {
    const key = item?.id ? toComparableId(item.id) : null;
    if (!key) {
      return item;
    }
    const mappedCode = codeMap.get(key);
    if (mappedCode && mappedCode !== item.code) {
      return { ...item, code: mappedCode };
    }
    return item;
  });

const extractClassSequence = (className) => {
  if (!className || typeof className !== "string") {
    return null;
  }
  const match = className.match(/(\d+)(?:\s*)$/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  return Number.isNaN(numeric) ? null : numeric;
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
    minStudents: initialValues.minStudents ?? initialValues.min_students ?? undefined,
    maxStudents: initialValues.maxStudents ?? initialValues.max_students ?? undefined,
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
  const [existingClasses, setExistingClasses] = useState([]);
  const [loadingExistingClasses, setLoadingExistingClasses] = useState(false);
  const [semesterCodeMap, setSemesterCodeMap] = useState(() => new Map());
  const [initialRecord, setInitialRecord] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [hasLessons, setHasLessons] = useState(false);
  const watchedSemesterId = Form.useWatch("semesterId", form);
  const watchedLevelId = Form.useWatch("levelId", form);
  const watchedSubjectId = Form.useWatch("subjectId", form);
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
    const formOptionsPromise = ClassListApi.getFormOptions();
    const semestersPromise = SemesterApi.getSemesters({ pageSize: 200 }).catch(
      (error) => {
        console.error("Failed to load semester codes:", error);
        return { items: [] };
      }
    );

    Promise.all([formOptionsPromise, semestersPromise])
      .then(([data, semestersResponse]) => {
        const semesterItems =
          semestersResponse?.items ??
          semestersResponse?.data ??
          semestersResponse ??
          [];
        const codeMap = buildSemesterCodeMap(
          Array.isArray(semesterItems) ? semesterItems : []
        );
        setSemesterCodeMap(codeMap);

        const normalizedLevels = normalizeLevels(
          data?.levels ?? data?.levelOptions ?? []
        );
        const normalizedSemesters = normalizeSemesters(
          data?.semesters ?? data?.semesterOptions ?? []
        );
        const filteredSemesters = ensureSemesterOptionVisible(
          filterFutureSemesters(
            applySemesterCodes(normalizedSemesters, codeMap)
          ),
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
                filterFutureSemesters(
                  applySemesterCodes(
                    normalizeSemesters(fallbackSemesters),
                    codeMap
                  )
                ),
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
            filterFutureSemesters(normalizeSemesters(fallbackSemesters)),
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
        console.log("DEBUG: API response data:", data);
        console.log("DEBUG: students array:", data?.students);
        console.log("DEBUG: totalStudents field:", data?.totalStudents);
        const normalized = normalizeClassDetail(data ?? {});
        console.log("DEBUG: normalized data:", normalized);
        form.setFieldsValue(normalized);
        setCurrentLevel(normalized.levelId);
        setInitialRecord(normalized);
        setInitialRecord(normalized);
        setTotalStudents(normalized.totalStudents ?? 0);
        setHasLessons((data?.totalLessons ?? 0) > 0);
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
      setExistingClasses([]);
      setLoadingExistingClasses(false);
      setSemesterCodeMap(new Map());
      setInitialRecord(null);
      setInitialRecord(null);
      setTotalStudents(0);
      setHasLessons(false);
    }
  }, [open, form]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLoadingExistingClasses(true);
    ClassListApi.getAll()
      .then((data) => setExistingClasses(normalizeExistingClasses(data ?? [])))
      .catch((error) => {
        console.error("Failed to load existing classes:", error);
        setExistingClasses([]);
      })
      .finally(() => setLoadingExistingClasses(false));
  }, [open]);

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
  const effectiveLoading = isLoading || loadingExistingClasses;

  const comparableClassId = useMemo(
    () => toComparableId(classId),
    [classId]
  );

  const initialSnapshot = initialRecord ?? derivedInitialValues;
  const initialSemesterId = toComparableId(initialSnapshot?.semesterId);
  const initialLevelId = toComparableId(initialSnapshot?.levelId);
  const initialSubjectId = toComparableId(initialSnapshot?.subjectId);
  const initialClassName = initialSnapshot?.name ?? "";

  const findSemesterById = useCallback(
    (value) => {
      const target = value?.toString();
      return options.semesters.find(
        (item) => item?.id?.toString() === target
      );
    },
    [options.semesters]
  );

  const findLevelById = useCallback(
    (value) => {
      const target = value?.toString();
      return options.levels.find((item) => item?.id?.toString() === target);
    },
    [options.levels]
  );

  const findSubjectById = useCallback(
    (value) => {
      const target = value?.toString();
      return options.subjects.find((item) => item?.id?.toString() === target);
    },
    [options.subjects]
  );

  const getSemesterCodeFromMap = useCallback(
    (semesterId) => {
      const key = toComparableId(semesterId);
      if (!key) {
        return "";
      }
      const code = semesterCodeMap.get(key) ?? "";
      // Debug: log if code not found
      if (!code && semesterCodeMap.size > 0) {
        console.debug(
          `Semester code not found for semesterId: ${semesterId} (key: ${key}). Available keys:`,
          Array.from(semesterCodeMap.keys())
        );
      }
      return code;
    },
    [semesterCodeMap]
  );

  const buildClassName = useCallback(
    (semesterId, levelId, subjectId) => {
      if (!semesterId || !levelId || !subjectId) {
        return "";
      }
      const semester = findSemesterById(semesterId);
      const level = findLevelById(levelId);
      const subject = findSubjectById(subjectId);
      // Priority: semesterCodeMap (from DB) > semester.code > fallback extraction
      // Priority: semesterCodeMap (from DB) > semester.code > fallback extraction
      const mappedSemesterCode = getSemesterCodeFromMap(semesterId);
      const semesterCode =
        mappedSemesterCode ||
        semester?.code ||
        semester?.semesterCode ||
        semester?.semester_code ||
        extractSemesterCode(
          semester?.name ??
          semester?.label ??
          semester?.semesterName ??
          semester?.semester_name ??
          ""
        );
      const levelCode = level?.code ?? extractLevelCode(level?.name);
      const subjectCode =
        subject?.code ??
        subject?.subjectCode ??
        subject?.subject_code ??
        subject?.name;
      if (!semesterCode || !levelCode || !subjectCode) {
        return "";
      }
      const normalizedSemesterId = toComparableId(semesterId);
      const normalizedLevelId = toComparableId(levelId);
      const normalizedSubjectId = toComparableId(subjectId);
      if (
        isEditMode &&
        initialClassName &&
        initialSemesterId &&
        initialLevelId &&
        initialSubjectId &&
        normalizedSemesterId === initialSemesterId &&
        normalizedLevelId === initialLevelId &&
        normalizedSubjectId === initialSubjectId
      ) {
        return initialClassName;
      }
      const relatedClasses = existingClasses.filter(
        (item) =>
          (!comparableClassId || item.classId !== comparableClassId) &&
          item.semesterId === normalizedSemesterId &&
          item.levelId === normalizedLevelId &&
          item.subjectId === normalizedSubjectId
      );
      const maxSequence =
        relatedClasses.reduce((max, item) => {
          const seq = extractClassSequence(item.className);
          if (seq && seq > max) {
            return seq;
          }
          return max;
        }, 0) || 0;
      const sequence = (maxSequence + 1).toString().padStart(2, "0");
      return `${semesterCode}-${levelCode}-${subjectCode}-${sequence}`;
    },
    [
      existingClasses,
      findLevelById,
      findSemesterById,
      findSubjectById,
      getSemesterCodeFromMap,
      isEditMode,
      initialClassName,
      initialSemesterId,
      initialLevelId,
      initialSubjectId,
      comparableClassId,
    ]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!watchedSemesterId || !watchedLevelId || !watchedSubjectId) {
      return;
    }
    // Wait for semesterCodeMap to be loaded before generating class name
    if (semesterCodeMap.size === 0 && !loadingOptions) {
      // Map is empty and not loading, proceed anyway (fallback will be used)
    }
    const generatedName = buildClassName(
      watchedSemesterId,
      watchedLevelId,
      watchedSubjectId
    );
    const currentName = form.getFieldValue("name");
    if ((generatedName || currentName) && currentName !== generatedName) {
      form.setFieldsValue({ name: generatedName || "" });
    }
  }, [
    open,
    watchedSemesterId,
    watchedLevelId,
    watchedSubjectId,
    buildClassName,
    form,
    semesterCodeMap,
    loadingOptions,
  ]);

  const handleSubmit = async () => {
    console.debug("ClassFormModal.handleSubmit invoked", { isEditMode, classId });
    let notifyKey = null;
    const actionType = isEditMode ? "update" : "create";
    try {
      const values = await form.validateFields();
      console.debug("ClassFormModal.validateFields result", values);
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

      // include min/max if provided
      if (values.minStudents !== undefined && values.minStudents !== null && values.minStudents !== "") {
        payload.minStudents = Number(values.minStudents);
      }
      if (values.maxStudents !== undefined && values.maxStudents !== null && values.maxStudents !== "") {
        payload.maxStudents = Number(values.maxStudents);
      }

      // Validate maxStudents cannot be less than current students
      if (isEditMode && totalStudents > 0) {
        const maxVal = payload.maxStudents;
        if (maxVal !== undefined && maxVal < totalStudents) {
          notifyError(
            `class-validation-error`,
            "Validation failed",
            `Max students (${maxVal}) cannot be less than current students (${totalStudents})`
          );
          return;
        }
      }

      // Auto-deactivate if minStudents > current students (only on edit mode)
      if (isEditMode && totalStudents > 0) {
        const minVal = payload.minStudents;
        if (minVal !== undefined && minVal > totalStudents) {
          // If minStudents requirement exceeds current students, must deactivate
          payload.status = "Inactive";
          console.debug("Auto-deactivating class: minStudents exceeds current students", {
            minStudents: minVal,
            totalStudents,
          });
        }
      }

      // Client-side enforcement: cannot create as Active if minStudents > current (create -> current = 0)
      if (!isEditMode && values.status && values.status === "Active") {
        const min = payload.minStudents ?? 0;
        if (0 < min) {
          notifyError(
            notifyKey ?? `class-create-validation`,
            "Cannot create class as Active",
            `Class requires at least ${min} students before activating.`
          );
          return;
        }
      }

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
      console.debug("ClassFormModal.submitting payload", payload);
      if (isEditMode && classId) {
        const result = await ClassListApi.update(classId, payload);
        console.debug("ClassListApi.update result", result);
        notifySuccess(
          notifyKey,
          "Class updated",
          `${trimmedName} updated successfully.`
        );
      } else {
        const result = await ClassListApi.create(payload);
        console.debug("ClassListApi.create result", result);
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
      console.error("Submission error response data:", error?.response?.data ?? error?.data ?? null);
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
      okButtonProps={{ disabled: effectiveLoading || hasLessons }}
    >
      {effectiveLoading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Spin />
        </div>
      ) : (
        <>
          {hasLessons && (
            <Alert
              message="Cannot Edit Class"
              description="This class already has scheduled lessons. Editing is disabled to preserve schedule integrity."
              type="warning"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}
          <Form
            disabled={hasLessons}
            form={form}
            layout="vertical"
            autoComplete="off"
            initialValues={deriveInitialFormValues(initialValues)}
          >
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

            <Form.Item
              label="Class Name"
              name="name"
              rules={[
                { required: true, message: "Please enter the class name." },
                {
                  max: 120,
                  message: "Class names must not exceed 120 characters.",
                },
              ]}
            >
              <Input
                placeholder="Class name will be generated automatically"
                disabled
              />
            </Form.Item>

            {totalStudents > 0 && (
              <Form.Item
                label="Current Students"
              >
                <Input
                  value={totalStudents}
                  disabled
                  readOnly
                  placeholder="Total students in this class"
                  style={{ fontSize: "16px", fontWeight: "bold", color: "#1f1f1f" }}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Min Students"
              name="minStudents"
              rules={[
                { required: true, message: "Please enter min students" },
                {
                  validator: async (_, value) => {
                    if (value === undefined || value === null || value === "") return;
                    if (typeof value !== 'number' || !Number.isInteger(value)) {
                      throw new Error('Min students must be an integer');
                    }
                    if (value < 5) {
                      throw new Error('Minimum is 5 students');
                    }
                    if (value > 50) {
                      throw new Error('Cannot exceed 50 students');
                    }
                  }
                }
              ]}
            >
              <InputNumber placeholder="Min students" min={5} max={50} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Max Students"
              name="maxStudents"
              rules={[
                { required: true, message: "Please enter max students" },
                {
                  validator: async (rule, value, callback) => {
                    if (value === undefined || value === null || value === "") {
                      callback();
                      return;
                    }
                    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
                      callback(new Error('Max students must be an integer >= 0'));
                      return;
                    }
                    if (value > 50) {
                      callback(new Error('Cannot exceed 50 students'));
                      return;
                    }
                    const minVal = form.getFieldValue('minStudents');
                    const minNum = (typeof minVal === 'number') ? minVal : (minVal ? Number(minVal) : null);
                    if (minNum !== null && minNum !== undefined && Number(minNum) > Number(value)) {
                      callback(new Error('Max students must be >= Min students'));
                      return;
                    }
                    if (totalStudents > 0 && Number(value) < totalStudents) {
                      callback(new Error(`Max students cannot be less than current students (${totalStudents})`));
                      return;
                    }
                    callback();
                  }
                }
              ]}
            >
              <InputNumber placeholder="Max students" min={0} max={50} style={{ width: '100%' }} />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}
