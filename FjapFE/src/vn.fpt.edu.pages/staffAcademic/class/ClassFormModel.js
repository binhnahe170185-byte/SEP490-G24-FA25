import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Form, Input, Modal, Select, Spin } from "antd";
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
          filterUpcomingSemesters(
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
                  filterUpcomingSemesters(
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
        setInitialRecord(normalized);
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
      okButtonProps={{ disabled: effectiveLoading }}
    >
      {effectiveLoading ? (
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
              { required: true, message: "Vui lòng nhập tên lớp" },
              {
                max: 120,
                message: "Tên lớp không được vượt quá 120 ký tự",
              },
            ]}
          >
            <Input
              placeholder="Class name will be generated automatically"
              disabled
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
