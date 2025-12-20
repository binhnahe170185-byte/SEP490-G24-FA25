import React, { useState, useEffect, useCallback } from "react";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  message,
  Spin,
  InputNumber,
  Space,
  Modal,
  Form,
  Popover,
  Input,
  Tooltip
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  EditOutlined,
  MessageOutlined
} from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../login/AuthContext";
import ManagerGrades from "../../../vn.fpt.edu.api/ManagerGrades";
import { useNotify } from "../../../vn.fpt.edu.common/notifications";

export default function GradeEntry() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const base = location.pathname.startsWith('/lecturer') ? '/lecturer' : '/manager';

  const [courseDetails, setCourseDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [gradeComponentWeights, setGradeComponentWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [editedDataAll, setEditedDataAll] = useState({}); // Track all changes in batch mode
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [form] = Form.useForm();

  const { pending: notifyPending, success: notifySuccess, error: notifyError } = useNotify();

  const userId = user?.id;
  const courseFromState = location.state?.course;

  // Helper function to map grade type names to data indices
  const getDataIndexForComponent = (gradeTypeName, subjectGradeTypeId) => {
    // Create a unique dataIndex based on SubjectGradeTypeId to avoid conflicts
    return `gradeComponent_${subjectGradeTypeId}`;
  };
  // Helper to map comment indices per component
  const getCommentDataIndexForComponent = (gradeTypeName, subjectGradeTypeId) => {
    return `gradeComponentComment_${subjectGradeTypeId}`;
  };

  // Load course details
  const loadData = useCallback(async (preserveEditingKey = null) => {
    try {
      setLoading(true);
      const data = await ManagerGrades.getCourseDetails(userId, courseId);
      setCourseDetails(data);
      setGradeComponentWeights(data.gradeComponentWeights || []);

      // Map student data with dynamic grade components
      const mappedStudents = data.students.map(s => {
        const studentData = { ...s, key: s.studentId };
        data.gradeComponentWeights?.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          const commentIndex = getCommentDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);

          // Find score from GradeComponentScores
          const gradeComponentScore = s.gradeComponentScores?.find(gcs =>
            gcs.subjectGradeTypeId === weight.subjectGradeTypeId
          );
          // Preserve 0 values - use nullish coalescing instead of logical OR
          studentData[dataIndex] = gradeComponentScore?.score !== undefined && gradeComponentScore?.score !== null
            ? gradeComponentScore.score
            : null;
          studentData[commentIndex] = gradeComponentScore?.comment || "";
        });

        return studentData;
      });

      setStudents(mappedStudents);

      // After reload, if we were editing a record, update form with latest data
      if (preserveEditingKey) {
        const updatedRecord = mappedStudents.find(s => s.key === preserveEditingKey);
        if (updatedRecord) {
          // Update form with latest data (including newly saved comments)
          const latestFormValues = {};
          data.gradeComponentWeights?.forEach(weight => {
            const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
            const commentIndex = getCommentDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
            latestFormValues[dataIndex] = updatedRecord[dataIndex];
            latestFormValues[commentIndex] = updatedRecord[commentIndex];
          });
          form.setFieldsValue(latestFormValues);
        }
      }
    } catch (error) {
      message.error("Failed to load course details");
    } finally {
      setLoading(false);
    }
  }, [userId, courseId, form]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper function to get weight for a grade component
  const getWeightForComponent = (componentName) => {
    const weight = gradeComponentWeights.find(w =>
      w.gradeTypeName.toLowerCase().includes(componentName.toLowerCase()) ||
      componentName.toLowerCase().includes(w.gradeTypeName.toLowerCase())
    );
    return weight ? weight.weight / 100 : 0; // Convert percentage to decimal
  };

  const isEditing = (record) => record.key === editingKey;
  const isBatchEditing = () => batchEditMode;

  // Handle grade change in batch mode
  const handleBatchGradeChange = (studentId, dataIndex, value) => {
    if (!studentId || !dataIndex) {
      return;
    }

    if (!batchEditMode) {
      return;
    }

    setEditedDataAll(prev => {
      const newData = { ...prev };
      if (!newData[studentId]) {
        newData[studentId] = {};
      }

      // Store the edited value - convert to number or null
      let numValue = null;
      if (value !== null && value !== undefined && value !== '') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) {
          numValue = parsed;
        }
      }
      newData[studentId][dataIndex] = numValue;

      // Find the original student record to get original values for unchanged fields
      const student = students.find(s => {
        const sId = String(s.studentId || '');
        const targetId = String(studentId || '');
        return sId === targetId;
      });

      // Calculate average for this student - combine edited and original values
      let weightedSum = 0;

      if (gradeComponentWeights && Array.isArray(gradeComponentWeights)) {
        gradeComponentWeights.forEach(weight => {
          if (weight && weight.subjectGradeTypeId) {
            const idx = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
            if (!idx) return;

            // Get score: edited value first, then original value
            let score = null;
            if (newData[studentId].hasOwnProperty(idx)) {
              // Field was edited
              score = newData[studentId][idx];
            } else if (student && student.hasOwnProperty(idx) && student[idx] !== null && student[idx] !== undefined) {
              // Field not edited, use original
              score = student[idx];
            }

            // Only add to average if we have a valid number
            if (score !== null && score !== undefined && !isNaN(score) && typeof score === 'number') {
              const weightValue = parseFloat(weight.weight) || 0;
              // Weight is already in percentage, so divide by 100
              weightedSum += score * (weightValue / 100);
            }
          }
        });
      }

      // Calculate final average - weightedSum already contains the weighted average
      const average = weightedSum;
      newData[studentId].average = parseFloat(average.toFixed(2));
      const passMark = courseDetails?.passMark ?? 5.0;
      // Enforce attendance >= 80% if available
      const attendanceRate = (students.find(s => (s.studentId || '').toString() === (studentId || '').toString())?.attendanceRate);
      const meetsAttendance = attendanceRate == null ? true : attendanceRate >= 0.8;
      newData[studentId].status = average >= passMark && meetsAttendance ? "Passed" : "Failed";

      return newData;
    });
  };

  const edit = (record) => {
    const formValues = {};

    // Set values for dynamic grade components
    gradeComponentWeights.forEach(weight => {
      const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      const commentIndex = getCommentDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      formValues[dataIndex] = record[dataIndex];
      formValues[commentIndex] = record[commentIndex];
    });

    form.setFieldsValue(formValues);
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey('');
  };

  const toggleBatchEditMode = () => {
    if (batchEditMode) {
      // Exiting batch mode - clear changes if user confirms
      const hasChanges = Object.keys(editedDataAll).length > 0;
      if (hasChanges) {
        Modal.confirm({
          title: 'Exit batch edit mode?',
          content: 'You have unsaved changes. Are you sure you want to exit?',
          okText: 'Yes, Exit',
          cancelText: 'Cancel',
          onOk: () => {
            setBatchEditMode(false);
            setEditedDataAll({});
            setEditingKey('');
          },
          onCancel: () => {
            // Do nothing, stay in batch mode
          },
        });
      } else {
        // No changes, exit immediately
        setBatchEditMode(false);
        setEditedDataAll({});
        setEditingKey('');
      }
    } else {
      // Entering batch mode - cancel any individual edit
      if (editingKey !== '') {
        setEditingKey('');
      }
      setBatchEditMode(true);
    }
  };

  const save = async (key) => {
    // Unique notification key for individual save
    const notifyKey = `save-grade-${key}-${Date.now()}`;

    try {
      const row = await form.validateFields();
      const newData = [...students];
      const index = newData.findIndex((item) => key === item.key);

      if (index > -1) {
        const item = newData[index];

        // Notify pending
        notifyPending(
          notifyKey,
          "Updating grade",
          `Saving changes for ${item.studentName || item.studentId}...`
        );

        // Calculate average using weights from API
        let average = 0;
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          const score = row[dataIndex] || 0;
          average += score * (weight.weight / 100);
        });

        const passMark = courseDetails?.passMark ?? 5.0;
        // Enforce attendance >= 80% if available
        const attendanceRate = item?.attendanceRate;
        const meetsAttendance = attendanceRate == null ? true : attendanceRate >= 0.8;
        const status = average >= passMark && meetsAttendance ? "Passed" : "Failed";

        const updatedItem = {
          ...item,
          ...row,
          average: parseFloat(average.toFixed(2)),
          status
        };

        // Update dynamic grade components in the item
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          updatedItem[dataIndex] = row[dataIndex];
        });

        newData.splice(index, 1, updatedItem);

        // Prepare data for API - send ALL grade components that have score
        // IMPORTANT: Always send ALL grade components with score to preserve existing comments
        const existingGradeComponentsMap = {};
        if (item.gradeComponentScores && Array.isArray(item.gradeComponentScores)) {
          item.gradeComponentScores.forEach(gcs => {
            existingGradeComponentsMap[gcs.subjectGradeTypeId] = gcs;
          });
        }

        const gradeComponents = [];
        gradeComponentWeights.forEach(weight => {
          const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
          const commentIndex = getCommentDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);

          // Get values from form (user's current input in the form)
          const formScore = row[dataIndex];
          const formComment = row[commentIndex];

          // Get existing grade component from backend (most reliable source)
          const existingGradeComponent = existingGradeComponentsMap[weight.subjectGradeTypeId];

          // Get existing values from record (may not have latest data)
          const existingScore = item[dataIndex];
          const existingComment = item[commentIndex];

          // Determine score: use form value if provided, otherwise use existing from backend
          let finalScore = null;
          if (formScore !== null && formScore !== undefined && formScore !== '') {
            const parsed = parseFloat(formScore);
            if (!isNaN(parsed)) {
              finalScore = parsed;
            }
          }
          // If no form score, use existing score (prioritize backend data)
          if (finalScore === null) {
            if (existingGradeComponent?.score !== null && existingGradeComponent?.score !== undefined) {
              finalScore = existingGradeComponent.score;
            } else if (existingScore !== null && existingScore !== undefined) {
              finalScore = existingScore;
            }
          }

          // Determine comment: prioritize form value, fallback to backend data
          let finalComment = null;
          if (formComment !== null && formComment !== undefined) {
            // Form has a value - use it (empty string means clear comment)
            finalComment = typeof formComment === 'string' && formComment.trim() !== ''
              ? formComment.trim()
              : null;
          } else {
            // Form doesn't have value - keep existing comment from backend (most reliable)
            if (existingGradeComponent?.comment) {
              finalComment = existingGradeComponent.comment;
            } else if (existingComment !== null && existingComment !== undefined && existingComment !== '') {
              finalComment = typeof existingComment === 'string' ? existingComment : null;
            }
          }

          // Only send grade component if it has a valid score
          if (finalScore !== null && finalScore !== undefined) {
            gradeComponents.push({
              subjectGradeTypeId: weight.subjectGradeTypeId,
              score: finalScore,
              comment: finalComment || null
            });
          }
        });

        // Validate gradeId exists
        if (!item.gradeId) {
          const msg = "Grade ID is missing. Cannot save.";
          notifyError(notifyKey, "Save Failed", msg);
          return;
        }

        // Validate that we have at least one grade component to save
        if (!gradeComponents || gradeComponents.length === 0) {
          const msg = "No grade data to save. Please enter at least one score.";
          notifyError(notifyKey, "Save Warning", msg);
          return;
        }

        console.log("Saving grade components:", gradeComponents);
        console.log("Student ID:", item.studentId, "Grade ID:", item.gradeId);

        // Save to API
        setSaving(true);
        await ManagerGrades.updateStudentGradeComponents(
          userId,
          courseId,
          item.studentId,
          item.gradeId,
          gradeComponents
        );

        setStudents(newData);

        notifySuccess(
          notifyKey,
          "Grade Updated",
          `Successfully updated grade for ${item.studentName || item.studentId}`
        );

        // Clear edit mode - return to view mode after successful save
        setEditingKey('');

        // Reload data to get updated values from server
        await loadData();
      }
    } catch (errInfo) {
      console.error("Error saving grade:", errInfo);
      const errorMessage = errInfo?.response?.data?.message || errInfo?.message || "Failed to update grade";

      const errorKey = `save-error-${Date.now()}`;
      notifyError(
        errorKey,
        "Save Failed",
        `Failed to update grade: ${errorMessage}`
      );
    } finally {
      setSaving(false);
    }
  };

  const EditableCell = ({
    editing,
    dataIndex,
    title,
    inputType,
    commentIndex,
    record,
    index,
    children,
    ...restProps
  }) => {
    // Safety checks
    if (!record || !dataIndex) {
      return <td {...restProps}>{children}</td>;
    }

    const isBatchMode = isBatchEditing();
    const isCellEditable = editing || (isBatchMode && dataIndex && typeof dataIndex === 'string' && dataIndex.startsWith('gradeComponent_'));

    // Create unique field name for each cell (combine studentId and dataIndex)
    const uniqueFieldName = isBatchMode && record.studentId
      ? `${record.studentId}_${dataIndex}`
      : dataIndex;

    // Get value for batch mode - with safe access
    let batchValue = undefined;
    if (isBatchMode && record && record.studentId && editedDataAll && editedDataAll[record.studentId]) {
      batchValue = editedDataAll[record.studentId][dataIndex];
    }

    // Get display value safely - use batch value if edited, otherwise use original record value
    const recordValue = record && dataIndex ? (record[dataIndex] ?? null) : null;
    const displayValue = isBatchMode && batchValue !== undefined ? batchValue : recordValue;

    return (
      <td {...restProps}>
        {isCellEditable ? (
          isBatchMode ? (
            inputType === 'text' ? (
              <span>{displayValue ?? ''}</span>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <InputNumber
                  min={0}
                  max={10}
                  step={0.1}
                  precision={1}
                  style={{ width: '100%' }}
                  value={displayValue !== null && displayValue !== undefined ? displayValue : undefined}
                  onChange={(value) => {
                    if (record && record.studentId && dataIndex) {
                      handleBatchGradeChange(record.studentId, dataIndex, value);
                    }
                  }}
                />
                <Tooltip title="View comment (edit in individual mode)">
                  <Popover
                    placement="right"
                    title="Comment"
                    content={<div style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{(record && commentIndex) ? (record[commentIndex] || "") : ""}</div>}
                    trigger="click"
                  >
                    <Button size="small" icon={<MessageOutlined />} />
                  </Popover>
                </Tooltip>
              </div>
            )
          ) : (
            inputType === 'text' ? (
              <Form.Item name={dataIndex} style={{ margin: 0 }} initialValue={displayValue}>
                <Input.TextArea rows={2} />
              </Form.Item>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Form.Item
                  name={dataIndex}
                  style={{ margin: 0, flex: 1 }}
                  initialValue={displayValue}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (value === null || value === undefined || value === '') {
                          return Promise.resolve();
                        }
                        if (value < 0 || value > 10) {
                          return Promise.reject(new Error('Grade must be between 0 and 10'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <InputNumber min={0} max={10} step={0.1} precision={1} style={{ width: '100%' }} />
                </Form.Item>
                {commentIndex && (
                  <Popover
                    placement="right"
                    title="Comment"
                    trigger="click"
                    content={
                      <div style={{ width: 280 }}>
                        <Form.Item name={commentIndex} style={{ margin: 0 }} initialValue={record?.[commentIndex] ?? ""}>
                          <Input.TextArea rows={3} maxLength={500} placeholder="Add a comment for this grade item" />
                        </Form.Item>
                      </div>
                    }
                  >
                    <Tooltip title="Edit comment">
                      <Button size="small" icon={<MessageOutlined />} />
                    </Tooltip>
                  </Popover>
                )}
              </div>
            )
          )
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <span>
              {inputType === 'text'
                ? (displayValue ?? '')
                : (typeof displayValue === 'number' && !isNaN(displayValue)
                  ? displayValue.toFixed(1)
                  : "-")}
            </span>
            {commentIndex && (
              <Popover
                placement="right"
                title="Comment"
                content={<div style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{(record && commentIndex) ? (record[commentIndex] || "") : ""}</div>}
                trigger="click"
              >
                <Tooltip title={(record && commentIndex && record[commentIndex]) ? "View comment" : "No comment"}>
                  <Button size="small" icon={<MessageOutlined />} type={(record && commentIndex && record[commentIndex]) ? "default" : "dashed"} />
                </Tooltip>
              </Popover>
            )}
          </div>
        )}
      </td>
    );
  };

  // Generate columns dynamically based on gradeComponentWeights
  const generateColumns = () => {
    const baseColumns = [
      {
        title: "No.",
        key: "index",
        width: 60,
        render: (_, __, index) => index + 1,
      },
      {
        title: "Student ID",
        dataIndex: "studentId",
        key: "studentId",
        width: 120,
      },
      {
        title: "Student Name",
        dataIndex: "studentName",
        key: "studentName",
        width: 200,
      }
    ];

    // Add grade component columns dynamically: score with inline comment popover
    const gradeColumns = gradeComponentWeights.flatMap(weight => {
      const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      const commentIndex = getCommentDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);
      return [{
        title: `${weight.gradeTypeName} (${weight.weight}%)`,
        dataIndex: dataIndex,
        key: dataIndex,
        width: 170,
        align: "center",
        editable: true,
        inputType: 'number',
        commentIndex: commentIndex,
        render: (value) => {
          // Show value if it's a number (including 0), otherwise show "-" for null/undefined
          if (typeof value === 'number') {
            return value.toFixed(1);
          }
          return "-";
        },
      }];
    });

    const endColumns = [
      {
        title: "Average",
        dataIndex: "average",
        key: "average",
        width: 100,
        align: "center",
        render: (value, record) => {
          if (!record) {
            return <span style={{ fontWeight: 600, fontSize: 15 }}>-</span>;
          }
          // Use batch mode average if available
          const displayValue = batchEditMode && record.studentId && editedDataAll[record.studentId]?.average !== undefined
            ? editedDataAll[record.studentId].average
            : value;

          // Check attendance
          const attendanceRate = record.attendanceRate;
          // specific check: explicit fail if defined and < 0.8
          const isAttendanceFailed = attendanceRate != null && attendanceRate < 0.8;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 15, color: isAttendanceFailed ? '#ff4d4f' : 'inherit' }}>
                {typeof displayValue === 'number' ? displayValue.toFixed(1) : "-"}
              </span>
              {isAttendanceFailed && (
                <Tooltip title={`Attendance: ${(attendanceRate * 100).toFixed(0)}% (< 80%)`}>
                  <span style={{ fontSize: 11, color: '#ff4d4f', cursor: 'help' }}>
                    (Att. Fail)
                  </span>
                </Tooltip>
              )}
            </div>
          );
        },
      },

      {
        title: "Action",
        key: "action",
        width: 150,
        align: "center",
        render: (_, record) => {
          if (batchEditMode) {
            return <span style={{ color: '#8c8c8c' }}>Batch Edit Mode</span>;
          }
          const editable = isEditing(record);
          return editable ? (
            <Space>
              <Button
                type="link"
                onClick={() => save(record.key)}
                loading={saving}
              >
                Save
              </Button>
              <Button type="link" onClick={cancel}>
                Cancel
              </Button>
            </Space>
          ) : (
            <Button
              type="link"
              disabled={editingKey !== ''}
              onClick={() => edit(record)}
            >
              Edit
            </Button>
          );
        },
      }
    ];

    return [...baseColumns, ...gradeColumns, ...endColumns];
  };

  const columns = generateColumns();

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => {
        if (!record || !col.dataIndex) {
          return {
            record: record || {},
            inputType: col.inputType || 'number',
            commentIndex: col.commentIndex,
            dataIndex: col.dataIndex || '',
            title: col.title || '',
            editing: false,
          };
        }
        return {
          record,
          inputType: col.inputType || 'number',
          commentIndex: col.commentIndex,
          dataIndex: col.dataIndex,
          title: col.title || '',
          editing: isEditing(record) || isBatchEditing(),
        };
      },
    };
  });

  const handleSaveAll = async () => {
    try {
      const changesCount = Object.keys(editedDataAll).length;

      if (!batchEditMode) {
        message.warning("Please enter batch edit mode first");
        return;
      }

      if (changesCount === 0) {
        message.warning("No changes to save. Please enter some grades first.");
        return;
      }

      setShowSaveModal(true);
    } catch (error) {
      console.error("Error in handleSaveAll:", error);
      message.error(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const executeSaveAll = async () => {
    // Generates a unique notification key
    const notifyKey = `save-grades-batch-${courseId}-${Date.now()}`;

    try {
      setSavingAll(true);
      setShowSaveModal(false);

      // Get all student IDs that have changes
      const studentIdsWithChanges = Object.keys(editedDataAll);

      notifyPending(
        notifyKey,
        "Saving grades",
        `Processing updates for ${studentIdsWithChanges.length} students...`
      );

      let successCount = 0;
      let failCount = 0;
      const errors = [];

      // Save each student's grades
      for (const studentId of studentIdsWithChanges) {
        try {
          // Find the student record
          const student = students.find(s => s.studentId === studentId || String(s.studentId) === String(studentId));

          if (!student) {
            failCount++;
            continue;
          }

          if (!student.gradeId) {
            failCount++;
            continue;
          }

          const studentChanges = editedDataAll[studentId];
          if (!studentChanges) {
            continue;
          }

          const gradeComponents = [];

          // Include all grade components that were edited
          if (gradeComponentWeights && Array.isArray(gradeComponentWeights)) {
            gradeComponentWeights.forEach(weight => {
              if (weight && weight.subjectGradeTypeId) {
                const dataIndex = getDataIndexForComponent(weight.gradeTypeName, weight.subjectGradeTypeId);

                // Only save if this field was explicitly edited (exists in studentChanges)
                if (studentChanges.hasOwnProperty(dataIndex)) {
                  const editedScore = studentChanges[dataIndex];

                  // Include if score is a valid number (including 0)
                  if (editedScore !== null && editedScore !== undefined && editedScore !== '') {
                    const numScore = parseFloat(editedScore);
                    if (!isNaN(numScore) && numScore >= 0 && numScore <= 10) {
                      gradeComponents.push({
                        subjectGradeTypeId: weight.subjectGradeTypeId,
                        score: numScore
                      });
                    }
                  }
                  // If editedScore is null, it means user cleared the field - we skip it (don't update)
                }
                // If field wasn't edited, we don't include it in the save (keep existing value)
              }
            });
          }

          if (gradeComponents.length > 0) {
            await ManagerGrades.updateStudentGradeComponents(
              userId,
              courseId,
              student.studentId,
              student.gradeId,
              gradeComponents
            );
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to save grade for student ${studentId}:`, error);
          errors.push(`Student ${studentId}: ${error.message || 'Unknown error'}`);
          failCount++;
        }
      }

      if (failCount === 0 && successCount > 0) {
        notifySuccess(
          notifyKey,
          "Grades saved",
          `Successfully saved grades for ${successCount} student(s)`
        );
        setEditedDataAll({});
        setBatchEditMode(false);
        // Reload data to get updated values from server
        await loadData();
      } else if (successCount > 0) {
        notifySuccess(
          notifyKey,
          "Partial Success",
          `Saved ${successCount} student(s), failed ${failCount} student(s). Check console.`
        );
        console.error('Save errors:', errors);
        // Still reload to get what was saved
        await loadData();
      } else {
        notifyError(
          notifyKey,
          "Save Failed",
          "Failed to save grades. Check console for details."
        );
        console.error('All saves failed. Errors:', errors);
      }
    } catch (error) {
      console.error("Critical error in executeSaveAll:", error);
      notifyError(
        notifyKey,
        "System Error",
        error.message || "An unexpected error occurred"
      );
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading course details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { title: "Management" },
          { title: "Grade Management", onClick: () => navigate(`${base}/grades`) },
          { title: "Enter Grades" },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`${base}/grades`)}
          >
            Back
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`${base}/grades/${courseId}`, {
              state: { course: courseFromState }
            })}
          >
            View Details
          </Button>
          <Button
            type={batchEditMode ? "default" : "primary"}
            icon={<EditOutlined />}
            onClick={toggleBatchEditMode}
            danger={batchEditMode}
          >
            {batchEditMode ? "Exit Batch Edit" : "Enter Batch Edit Mode"}
          </Button>
          {batchEditMode && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAll}
              loading={savingAll}
              disabled={Object.keys(editedDataAll).length === 0}
            >
              Save All Changes ({Object.keys(editedDataAll).length})
            </Button>
          )}
        </Space>
      </div>

      {/* <Card style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, marginBottom: 16 }}>
          {courseFromState?.courseCode || courseDetails?.courseCode} - {courseFromState?.courseName || courseDetails?.courseName}
        </h2>
        <Space size="large">
          <span>📚 Class: {courseFromState?.className || courseDetails?.className}</span>
          <span>📅 Semester: {courseFromState?.semester || courseDetails?.semester}</span>
          <span>👨‍🎓 Total Students: {students.length}</span>
        </Space>
      </Card> */}

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Enter Student Grades</span>
            <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 400 }}>
              {batchEditMode
                ? "Batch Edit Mode: All students are editable. Enter grades and click 'Save All Changes' to save."
                : "Click 'Enter Batch Edit Mode' to edit all students at once, or click 'Edit' for individual students. Grades are from 0-10."}
            </span>
          </div>
        }
      >
        <Form form={form} component={false}>
          <Table
            components={{
              body: {
                cell: EditableCell,
              },
            }}
            columns={mergedColumns}
            dataSource={students}
            // scroll={{ x: 1400 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} students`,
            }}
          />
        </Form>
      </Card>

      <Modal
        title="Save All Changes"
        open={showSaveModal}
        onOk={executeSaveAll}
        onCancel={() => {
          setShowSaveModal(false);
        }}
        okText="Yes, Save All"
        cancelText="Cancel"
        confirmLoading={savingAll}
        okButtonProps={{ type: 'primary' }}
      >
        <p>Are you sure you want to save grades for <strong>{Object.keys(editedDataAll).length}</strong> student(s)?</p>
        <p style={{ color: '#8c8c8c', fontSize: '12px' }}>This action will save all grade changes you have made.</p>
      </Modal>
    </div>
  );
}