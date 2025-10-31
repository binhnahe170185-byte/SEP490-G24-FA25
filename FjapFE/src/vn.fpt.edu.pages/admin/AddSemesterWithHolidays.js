import React, { useState, useEffect } from "react";
import { Card, Form, DatePicker, Input, Button, message, Space, Typography, Row, Col, Steps, Select, Checkbox, List, Tag, Modal } from "antd";
import { SaveOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined, GlobalOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import SemesterApi from "../../vn.fpt.edu.api/Semester";
import HolidayApi from "../../vn.fpt.edu.api/Holiday";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

// Get semester season from date
// Returns: 'spring' | 'summer' | 'fall' | null
const getSemesterSeason = (date) => {
  if (!date) return null;
  
  const month = date.month() + 1; // dayjs months are 0-indexed
  const day = date.date();
  
  // Spring: 01/01 - 30/04
  if (month === 1 || month === 2 || month === 3 || (month === 4 && day <= 30)) {
    return 'spring';
  }
  // Summer: 01/05 - 31/08
  // Note: 01/05 means May 1st (month 5), not April 1st
  if (month === 5 || month === 6 || month === 7 || month === 8) {
    return 'summer';
  }
  // Fall: 01/09 - 31/12
  if (month >= 9 && month <= 12) {
    return 'fall';
  }
  
  return null;
};

// Check if date is within allowed semester ranges
const isDateInAllowedRange = (date) => {
  if (!date) return false;
  return getSemesterSeason(date) !== null;
};

// Auto-generate semester name based on season
const generateSemesterName = (startDate) => {
  if (!startDate) return '';
  
  const season = getSemesterSeason(startDate);
  const year = startDate.year();
  
  if (season === 'spring') {
    return `Spring ${year}`;
  } else if (season === 'summer') {
    return `Summer ${year}`;
  } else if (season === 'fall') {
    return `Fall ${year}`;
  }
  
  return '';
};

// Auto-generate semester code (2 chars season + 2 digits year)
const generateSemesterCode = (startDate) => {
  if (!startDate) return '';
  
  const season = getSemesterSeason(startDate);
  const year = startDate.year();
  const yearShort = year % 100;
  
  if (season === 'spring') {
    return `SP${yearShort.toString().padStart(2, '0')}`;
  } else if (season === 'summer') {
    return `SU${yearShort.toString().padStart(2, '0')}`;
  } else if (season === 'fall') {
    return `FA${yearShort.toString().padStart(2, '0')}`;
  }
  
  return '';
};

export default function AddSemesterWithHolidays() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [loadingJapanHolidays, setLoadingJapanHolidays] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [holidays, setHolidays] = useState([]);
  const [savedDates, setSavedDates] = useState({ startDate: null, endDate: null });
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalData, setErrorModalData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // ------- Persist step 1 dates in sessionStorage so step 3 can read reliably -------
  const SESSION_KEY = 'create_semester_form';
  
  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const restored = {};
        if (saved.startDate) restored.startDate = dayjs(saved.startDate);
        if (saved.endDate) restored.endDate = dayjs(saved.endDate);
        if (Object.keys(restored).length > 0) {
          form.setFieldsValue(restored);
        }
      }
    } catch (err) {
      console.error('Error restoring from sessionStorage:', err);
    }
  }, [form]);
  
  // Save whenever dates change - using useWatch to track changes
  const watchedStartDate = Form.useWatch('startDate', form);
  const watchedEndDate = Form.useWatch('endDate', form);
  
  useEffect(() => {
    if (watchedStartDate || watchedEndDate) {
      try {
        const payload = {
          startDate: watchedStartDate ? watchedStartDate.format('YYYY-MM-DD') : null,
          endDate: watchedEndDate ? watchedEndDate.format('YYYY-MM-DD') : null,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
        // Also save to state
        setSavedDates({
          startDate: watchedStartDate,
          endDate: watchedEndDate
        });
      } catch (err) {
        console.error('Error saving to sessionStorage:', err);
      }
    }
  }, [watchedStartDate, watchedEndDate]);
  
  // Use Form.useWatch at component level to watch startDate changes
  const startDate = Form.useWatch('startDate', form);

  const steps = [
    {
      title: 'Basic Info',
      description: 'Semester details',
    },
    {
      title: 'Holidays',
      description: 'Non-working days',
    },
    {
      title: 'Review',
      description: 'Confirm details',
    },
  ];

  const addHoliday = () => {
    const newHoliday = {
      id: Date.now(),
      name: "",
      date: null,
      type: "Custom",
      description: "",
      recurring: false,
    };
    setHolidays([...holidays, newHoliday]);
  };

  const removeHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  const updateHoliday = (id, field, value) => {
    setHolidays(holidays.map(h => 
      h.id === id ? { ...h, [field]: value } : h
    ));
  };

  const loadJapanHolidays = async () => {
    const semesterStart = form.getFieldValue('startDate');
    const semesterEnd = form.getFieldValue('endDate');
    
    if (!semesterStart || !semesterEnd) {
      message.warning("Please set semester dates first");
      return;
    }

    setLoadingJapanHolidays(true);
    try {
      // Get all years that cover the semester
      const startYear = semesterStart.year();
      const endYear = semesterEnd.year();
      const years = [];
      for (let year = startYear; year <= endYear; year++) {
        years.push(year);
      }

      // Fetch holidays for all years
      const allHolidays = [];
      for (const year of years) {
        const japanHolidays = await HolidayApi.getJapanHolidays(year);
        allHolidays.push(...japanHolidays);
      }

      if (allHolidays.length === 0) {
        message.info("No Japan holidays found for the selected years");
        setLoadingJapanHolidays(false);
        return;
      }

      // Filter holidays that fall within the semester range
      const filteredHolidays = allHolidays
        .map(h => ({
          ...h,
          date: dayjs(h.date)
        }))
        .filter(h => {
          const holidayDate = h.date;
          return holidayDate.isAfter(semesterStart.subtract(1, 'day')) && 
                 holidayDate.isBefore(semesterEnd.add(1, 'day'));
        });

      if (filteredHolidays.length === 0) {
        message.info("No Japan holidays found within the semester period");
        setLoadingJapanHolidays(false);
        return;
      }

      // Convert to our format and add to holidays list
      // Avoid duplicates by checking if holiday with same date already exists
      const existingDates = new Set(holidays.map(h => h.date?.format('YYYY-MM-DD')));
      
      const newJapanHolidays = filteredHolidays
        .filter(h => !existingDates.has(h.date.format('YYYY-MM-DD')))
        .map(h => ({
          id: Date.now() + Math.random(), // Unique ID
          name: h.name,
          date: h.date,
          type: h.type || "National",
          description: h.description || "",
          recurring: h.isRecurring !== undefined ? h.isRecurring : true,
        }));

      if (newJapanHolidays.length === 0) {
        message.info("All Japan holidays for this period are already added");
      } else {
        setHolidays([...holidays, ...newJapanHolidays]);
        message.success(`Loaded ${newJapanHolidays.length} Japan holiday(s)`);
      }
    } catch (error) {
      console.error("Error loading Japan holidays:", error);
      message.error("Failed to load Japan holidays. Please try again.");
    } finally {
      setLoadingJapanHolidays(false);
    }
  };

  // Auto-load Japan holidays when entering holidays step (step 1)
  useEffect(() => {
    if (currentStep === 1) {
      const semesterStart = form.getFieldValue('startDate');
      const semesterEnd = form.getFieldValue('endDate');
      
      // Only auto-load if dates are set and holidays list is empty
      if (semesterStart && semesterEnd && holidays.length === 0) {
        loadJapanHolidays();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const nextStep = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(['startDate', 'endDate']);
        // Save dates to state and sessionStorage before moving to next step
        const startDate = form.getFieldValue('startDate');
        const endDate = form.getFieldValue('endDate');
        if (startDate || endDate) {
          setSavedDates({ startDate, endDate });
          try {
            const payload = {
              startDate: startDate ? startDate.format('YYYY-MM-DD') : null,
              endDate: endDate ? endDate.format('YYYY-MM-DD') : null,
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
          } catch (err) {
            console.error('Error saving to sessionStorage:', err);
          }
        }
        setCurrentStep(1);
      } catch (error) {
        message.error("Please fill in all required fields");
      }
    } else if (currentStep === 1) {
      // Ensure dates are saved before going to review step
      const startDate = form.getFieldValue('startDate') || savedDates.startDate;
      const endDate = form.getFieldValue('endDate') || savedDates.endDate;
      if (startDate || endDate) {
        setSavedDates({ startDate, endDate });
      }
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    try {
      setLoading(true);
      
      // Get values from form, state, or sessionStorage (in priority order)
      let formValues = form.getFieldsValue();
      console.log('Form values from getFieldsValue:', formValues);
      
      // Use savedDates state if form values are empty (step 2 scenario)
      let startDate = formValues.startDate || savedDates.startDate;
      let endDate = formValues.endDate || savedDates.endDate;
      
      // Fallback to sessionStorage if still empty
      if (!startDate || !endDate) {
        try {
          const raw = sessionStorage.getItem(SESSION_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.startDate && !startDate) {
              startDate = dayjs(saved.startDate);
            }
            if (saved.endDate && !endDate) {
              endDate = dayjs(saved.endDate);
            }
          }
        } catch (err) {
          console.error('Error reading from sessionStorage:', err);
        }
      }
      
      console.log('Final dates - startDate:', startDate, 'endDate:', endDate);

      // Frontend validation
      if (!startDate || !endDate) {
        console.error('Missing dates');
        message.error('Please select both start and end dates');
        setLoading(false);
        return;
      }
      
      // Ensure dayjs objects
      if (typeof startDate === 'string') {
        startDate = dayjs(startDate);
      }
      if (typeof endDate === 'string') {
        endDate = dayjs(endDate);
      }

      // Validate dates are in allowed ranges
      if (!isDateInAllowedRange(startDate)) {
        message.error('Start date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)');
        setLoading(false);
        return;
      }

      if (!isDateInAllowedRange(endDate)) {
        message.error('End date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)');
        setLoading(false);
        return;
      }

      // Validate start and end dates are in the same season
      const startSeason = getSemesterSeason(startDate);
      const endSeason = getSemesterSeason(endDate);
      
      if (startSeason !== endSeason) {
        message.error('Invalid semester range. Start date and end date must be in the same season.');
        setLoading(false);
        return;
      }

      if (startDate.isAfter(endDate) || startDate.isSame(endDate)) {
        message.error('Start date must be before end date');
        setLoading(false);
        return;
      }

      // Check duration (30-365 days)
      const duration = endDate.diff(startDate, 'days');
      if (duration < 30) {
        message.error('Semester duration must be at least 30 days');
        setLoading(false);
        return;
      }
      if (duration > 365) {
        message.error('Semester duration cannot exceed 365 days');
        setLoading(false);
        return;
      }

      // Prepare payload for backend
      const payload = {
        startDate: startDate.format("YYYY-MM-DD"),
        endDate: endDate.format("YYYY-MM-DD"),
      };

      // Prepare holidays array for backend
      // Backend accepts holidays directly in the create semester request
      const holidayItems = holidays
        .filter(h => h.name && h.date)
        .map(h => ({
          name: h.name.trim(),
          date: h.date.format("YYYY-MM-DD"),
          type: h.type,
          description: h.description?.trim() || '',
          isRecurring: h.recurring, // camelCase to match backend JSON policy
        }));
      
      // Only include holidays if there are any
      if (holidayItems.length > 0) {
        payload.holidays = holidayItems;
      }

      console.log('Creating semester with payload:', payload);
      console.log('Payload JSON:', JSON.stringify(payload, null, 2));

      try {
        console.log('Calling SemesterApi.createSemester...');
        const created = await SemesterApi.createSemester(payload);
        console.log('Semester created successfully:', created);
        console.log('Created object keys:', created ? Object.keys(created) : 'null');
        
        setLoading(false);
        
        // Check if there's a warning about holidays (semester created but holidays failed)
        const warning = created?.warning || created?.data?.warning;
        if (warning) {
          console.warn('Holiday creation warning:', warning);
          // Still show success but with warning
          message.warning(warning, 5);
        }
        
        // Show success modal with semester information
        // Note: generateSemesterName and generateSemesterCode expect dayjs objects
        const semesterName = created?.name || created?.data?.name || (startDate ? generateSemesterName(startDate) : 'N/A');
        const semesterCode = created?.semesterCode || created?.data?.semesterCode || (startDate ? generateSemesterCode(startDate) : 'N/A');
        
        console.log('Semester name:', semesterName);
        console.log('Semester code:', semesterCode);
        
        // Clear persisted temp values before showing modal
        sessionStorage.removeItem(SESSION_KEY);
        
        // Prepare modal content data
        const startDateFormatted = startDate.format("DD/MM/YYYY");
        const endDateFormatted = endDate.format("DD/MM/YYYY");
        const duration = endDate.diff(startDate, 'days');
        const holidayCount = holidayItems.length;
        
        console.log('About to show Modal.success');
        console.log('Data prepared:', { semesterName, semesterCode, startDateFormatted, endDateFormatted, duration, holidayCount });
        
        console.log('Setting success modal data and showing modal');
        
        // Set success modal data and show it
        setSuccessModalData({
          semesterName,
          semesterCode,
          startDateFormatted,
          endDateFormatted,
          duration,
          holidayCount,
          warning
        });
        setSuccessModalVisible(true);
      } catch (e) {
        console.error('Error creating semester:', e);
        console.error('Error response:', e?.response);
        console.error('Error response data:', e?.response?.data);
        setLoading(false);
        
        // Extract error message with detailed information
        let errorMsg = 'Failed to create semester';
        let errorDetails = '';
        
        if (e?.response?.data) {
          const data = e.response.data;
          
          if (typeof data === 'string') {
            errorMsg = data;
          } else {
            if (data.message) {
              errorMsg = data.message;
            }
            if (data.details) {
              errorDetails = data.details;
            }
            if (data.overlappingSemesters && Array.isArray(data.overlappingSemesters)) {
              const conflicts = data.overlappingSemesters.map(s => 
                `${s.name} (${s.semesterCode}) [${s.startDate} to ${s.endDate}]`
              ).join('\n');
              errorDetails += `\n\nConflicting semesters:\n${conflicts}`;
            }
            if (data.errorType) {
              errorDetails += `\nError Type: ${data.errorType}`;
            }
            if (data.innerException) {
              errorDetails += `\n${data.innerException.type}: ${data.innerException.message}`;
            }
            if (data.errors) {
              const errorList = Object.entries(data.errors)
                .map(([key, messages]) => `${key}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
                .join('\n');
              errorDetails += `\nValidation Errors:\n${errorList}`;
            }
          }
        } else if (e?.message) {
          errorMsg = e.message;
        }
        
        console.log('About to show Modal.error with:', { errorMsg, errorDetails });
        
        // Show both message.error (quick notification) and Modal.error (detailed)
        message.error(errorMsg, 5);
        
        console.log('Setting error modal data and showing modal');
        
        // Set error modal data and show it
        setErrorModalData({
          errorMsg,
          errorDetails
        });
        setErrorModalVisible(true);
        
        return;
      }
    } catch (error) {
      // This catch handles form validation errors (from form.validateFields())
      console.error("Form validation or unexpected error:", error);
      setLoading(false);
      
      if (error.errorFields) {
        setErrorModalData({
          errorMsg: 'Lỗi xác thực',
          errorDetails: 'Vui lòng điền đầy đủ thông tin bắt buộc và kiểm tra lại các trường dữ liệu.'
        });
        setErrorModalVisible(true);
        return;
      }
      
      // Fallback for any other unexpected errors
      setErrorModalData({
        errorMsg: 'Lỗi không mong muốn',
        errorDetails: error?.message ? `Chi tiết: ${error.message}` : 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
      });
      setErrorModalVisible(true);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem(SESSION_KEY);
    navigate("/staffOfAdmin", { state: { activeTab: "sem:list" } });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Use startDate from component level (Form.useWatch)
        const generatedName = startDate && isDateInAllowedRange(startDate) ? generateSemesterName(startDate) : '';
        const generatedCode = startDate && isDateInAllowedRange(startDate) ? generateSemesterCode(startDate) : '';
        
        return (
          <Form
            form={form}
            layout="vertical"
          >
            {/* Auto-generated Semester Info Preview */}
            {startDate && isDateInAllowedRange(startDate) && generatedName && (
              <Card 
                style={{ 
                  marginBottom: 24, 
                  background: '#f0f9ff',
                  border: '1px solid #91d5ff'
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Semester Name:</Text>
                    <Text strong style={{ marginLeft: 8, fontSize: 16 }}>{generatedName}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Semester Code:</Text>
                    <Tag color="blue" style={{ marginLeft: 8, fontSize: 14, padding: '4px 12px' }}>
                      {generatedCode}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                    * Automatically generated based on start date
                  </Text>
                </Space>
              </Card>
            )}
            {startDate && !isDateInAllowedRange(startDate) && (
              <Card 
                style={{ 
                  marginBottom: 24, 
                  background: '#fff1f0',
                  border: '1px solid #ffccc7'
                }}
              >
                <Text type="danger">
                  ⚠️ Selected start date is not within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)
                </Text>
              </Card>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Start Date"
                  name="startDate"
                  rules={[
                    { required: true, message: "Please select start date" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        
                        // Check if date is in allowed range
                        if (!isDateInAllowedRange(value)) {
                          return Promise.reject(new Error('Start date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)'));
                        }
                        
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    disabledDate={(current) => {
                      // Disable dates outside allowed ranges
                      if (!current) return true;
                      return !isDateInAllowedRange(current);
                    }}
                    onChange={() => {
                      // Clear end date when start date changes to ensure validation
                      form.setFieldsValue({ endDate: null });
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="End Date"
                  name="endDate"
                  rules={[
                    { required: true, message: "Please select end date" },
                    {
                      validator: (_, value) => {
                        if (!value) return Promise.resolve();
                        
                        const startDate = form.getFieldValue('startDate');
                        if (!startDate) return Promise.resolve();
                        
                        // Check if end date is in allowed range
                        if (!isDateInAllowedRange(value)) {
                          return Promise.reject(new Error('End date must be within allowed semester ranges (Spring: Jan-Apr, Summer: May-Aug, Fall: Sep-Dec)'));
                        }
                        
                        // Check if end date is after start date
                        if (value.isSame(startDate) || value.isBefore(startDate)) {
                          return Promise.reject(new Error('End date must be after start date'));
                        }
                        
                        // Check if start and end dates are in the same season
                        const startSeason = getSemesterSeason(startDate);
                        const endSeason = getSemesterSeason(value);
                        
                        if (startSeason !== endSeason) {
                          return Promise.reject(new Error('Invalid semester range. Start date and end date must be in the same season.'));
                        }
                        
                        // Check duration (30-365 days)
                        const duration = value.diff(startDate, 'days');
                        if (duration < 30) {
                          return Promise.reject(new Error('Semester duration must be at least 30 days'));
                        }
                        if (duration > 365) {
                          return Promise.reject(new Error('Semester duration cannot exceed 365 days'));
                        }
                        
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    disabledDate={(current) => {
                      if (!current) return true;
                      
                      const startDate = form.getFieldValue('startDate');
                      if (!startDate) {
                        // If no start date, disable all dates outside allowed ranges
                        return !isDateInAllowedRange(current);
                      }
                      
                      // Disable dates before or same as start date
                      if (current.isSame(startDate) || current.isBefore(startDate)) {
                        return true;
                      }
                      
                      // Disable dates outside allowed ranges
                      if (!isDateInAllowedRange(current)) {
                        return true;
                      }
                      
                      // Disable dates not in the same season as start date
                      const startSeason = getSemesterSeason(startDate);
                      const currentSeason = getSemesterSeason(current);
                      if (startSeason !== currentSeason) {
                        return true;
                      }
                      
                      return false;
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        );

      case 1:
        const japanHolidays = holidays.filter(h => h.type === 'National');
        const customHolidays = holidays.filter(h => h.type !== 'National');
        
        return (
          <div>
            <div style={{ marginBottom: 24 }}>
              <Title level={4} style={{ marginBottom: 4 }}>Holidays</Title>
              <Text type="secondary">Japan public holidays have been automatically loaded. Add custom holidays if needed.</Text>
            </div>

            {/* Japan Holidays - Read Only */}
            <Card 
              title={
                <Space>
                  <GlobalOutlined />
                  <span>Japan Public Holidays</span>
                  <Tag color="blue">{japanHolidays.length}</Tag>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              {japanHolidays.length === 0 ? (
                <Text type="secondary">No holidays in this period</Text>
              ) : (
                <List
                  size="small"
                  dataSource={japanHolidays}
                  renderItem={(holiday) => (
                    <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <Text strong>{holiday.name}</Text>
                          {holiday.description && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {holiday.description}
                            </Text>
                          )}
                        </Space>
                        <Tag color="cyan">{holiday.date?.format('YYYY-MM-DD')}</Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>

            {/* Custom Holidays */}
            <Card 
              title={
                <Space>
                  <span>Custom Holidays</span>
                  {customHolidays.length > 0 && <Tag>{customHolidays.length}</Tag>}
                </Space>
              }
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={addHoliday}
                  size="small"
                >
                  Add
                </Button>
              }
            >
              {customHolidays.length === 0 ? (
                <Text type="secondary">No custom holidays</Text>
              ) : (
                <List
                  size="small"
                  dataSource={customHolidays}
                  renderItem={(holiday) => (
                    <List.Item 
                      style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                      actions={[
                        <Button 
                          type="text" 
                          danger 
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeHoliday(holiday.id)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Input
                              placeholder="Holiday name"
                              value={holiday.name}
                              onChange={(e) => updateHoliday(holiday.id, 'name', e.target.value)}
                              style={{ width: 150 }}
                              size="small"
                              status={holiday.name && holiday.name.length < 2 ? 'error' : ''}
                            />
                            <DatePicker
                              placeholder="Date"
                              value={holiday.date}
                              onChange={(date) => updateHoliday(holiday.id, 'date', date)}
                              disabledDate={(current) => {
                                const startDate = form.getFieldValue('startDate');
                                const endDate = form.getFieldValue('endDate');
                                if (!startDate || !endDate) return false;
                                return current && (current.isBefore(startDate) || current.isAfter(endDate));
                              }}
                              size="small"
                              style={{ width: 120 }}
                              format="YYYY-MM-DD"
                            />
                            <Select
                              value={holiday.type}
                              onChange={(value) => updateHoliday(holiday.id, 'type', value)}
                              size="small"
                              style={{ width: 100 }}
                            >
                              <Option value="National">National</Option>
                              <Option value="Religious">Religious</Option>
                              <Option value="Cultural">Cultural</Option>
                              <Option value="Custom">Custom</Option>
                            </Select>
                          </Space>
                        }
                        description={
                          <Input
                            placeholder="Description (optional)"
                            value={holiday.description || ''}
                            onChange={(e) => updateHoliday(holiday.id, 'description', e.target.value)}
                            size="small"
                            style={{ width: 300, marginTop: 4 }}
                            maxLength={500}
                          />
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>
        );

      case 2:
        // Read from multiple sources: state -> form -> sessionStorage
        let formValues = form.getFieldsValue();
        
        // Priority 1: Use savedDates state (most reliable)
        let finalStartDate = savedDates.startDate || formValues.startDate;
        let finalEndDate = savedDates.endDate || formValues.endDate;
        
        // Priority 2: If still empty, try sessionStorage
        if (!finalStartDate || !finalEndDate) {
          try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (raw) {
              const saved = JSON.parse(raw);
              if (saved.startDate && !finalStartDate) {
                finalStartDate = dayjs(saved.startDate);
              }
              if (saved.endDate && !finalEndDate) {
                finalEndDate = dayjs(saved.endDate);
              }
            }
          } catch (err) {
            console.error('Error reading from sessionStorage:', err);
          }
        }
        
        // Ensure dayjs objects
        if (finalStartDate && typeof finalStartDate === 'string') {
          finalStartDate = dayjs(finalStartDate);
        }
        if (finalEndDate && typeof finalEndDate === 'string') {
          finalEndDate = dayjs(finalEndDate);
        }
        
        const duration = finalEndDate && finalStartDate 
          ? finalEndDate.diff(finalStartDate, 'days') 
          : 0;
        const japanHolidaysCount = holidays.filter(h => h.type === 'National').length;
        const customHolidaysCount = holidays.filter(h => h.type !== 'National').length;
        const reviewName = finalStartDate ? generateSemesterName(finalStartDate) : 'Not set';
        const reviewCode = finalStartDate ? generateSemesterCode(finalStartDate) : 'Not set';
        
        return (
          <div>
            <Title level={4} style={{ marginBottom: 24 }}>Review Semester Details</Title>
            
            <Row gutter={24}>
              <Col xs={24} lg={10}>
                <Card 
                  title="Semester Information"
                  style={{ height: '100%' }}
                >
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Row>
                      <Col span={8}><Text type="secondary">Name:</Text></Col>
                      <Col span={16}><Text strong>{reviewName}</Text></Col>
                    </Row>
                    <Row>
                      <Col span={8}><Text type="secondary">Code:</Text></Col>
                      <Col span={16}>
                        <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                          {reviewCode}
                        </Tag>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}><Text type="secondary">Start Date:</Text></Col>
                      <Col span={16}>
                        <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                          {finalStartDate ? finalStartDate.format("YYYY-MM-DD") : 'Not set'}
                        </Tag>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}><Text type="secondary">End Date:</Text></Col>
                      <Col span={16}>
                        <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                          {finalEndDate ? finalEndDate.format("YYYY-MM-DD") : 'Not set'}
                        </Tag>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={8}><Text type="secondary">Duration:</Text></Col>
                      <Col span={16}>
                        <Text strong>{duration || 0} days</Text>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} lg={14}>
                <Card 
                  title={
                    <Space>
                      <span>Holidays</span>
                      <Tag color="processing">{holidays.length}</Tag>
                      {japanHolidaysCount > 0 && (
                        <Tag color="blue">{japanHolidaysCount} Japan</Tag>
                      )}
                      {customHolidaysCount > 0 && (
                        <Tag color="default">{customHolidaysCount} Custom</Tag>
                      )}
                    </Space>
                  }
                  style={{ height: '100%' }}
                >
                  {holidays.length === 0 ? (
                    <Text type="secondary">No holidays added</Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={holidays}
                      renderItem={(holiday) => (
                        <List.Item style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                          <Row style={{ width: '100%' }} gutter={8}>
                            <Col flex={1}>
                              <Text strong style={{ display: 'block', marginBottom: 4 }}>{holiday.name}</Text>
                              {holiday.description && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {holiday.description}
                                </Text>
                              )}
                            </Col>
                            <Col>
                              <Space direction="vertical" size={4} align="end">
                                <Tag color="cyan">{holiday.date?.format("YYYY-MM-DD")}</Tag>
                                {holiday.type !== 'National' && (
                                  <Tag color="default" style={{ fontSize: 11 }}>{holiday.type}</Tag>
                                )}
                              </Space>
                            </Col>
                          </Row>
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between" gutter={16}>
          <Col>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleCancel}
            >
              Back to Semester List
            </Button>
          </Col>
          <Col flex={1}>
            <div style={{ textAlign: "center" }}>
              <Title level={3} style={{ margin: 0 }}>Add New Semester</Title>
            </div>
          </Col>
          <Col style={{ visibility: "hidden" }}>
            {/* spacer to balance header layout */}
            <Button icon={<ArrowLeftOutlined />} />
          </Col>
        </Row>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        {renderStepContent()}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={prevStep}>
                Previous
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                Create Semester
              </Button>
            )}
            <Button onClick={handleCancel}>
              Cancel
            </Button>
          </Space>
        </div>
      </div>
      
      {/* Success Modal */}
      <Modal
        title="Success"
        open={successModalVisible}
        onCancel={() => {
          setSuccessModalVisible(false);
          setTimeout(() => {
            navigate("/staffOfAdmin", { state: { activeTab: "sem:list" }, replace: true });
          }, 100);
        }}
        footer={[
          <Button key="ok" type="primary" onClick={() => {
            setSuccessModalVisible(false);
            // Add a small delay to ensure modal closes before navigation
            setTimeout(() => {
              navigate("/staffOfAdmin", { state: { activeTab: "sem:list" }, replace: true });
            }, 100);
          }}>
            Back to List
          </Button>
        ]}
        width={500}
        centered
        maskClosable={false}
        style={{ zIndex: 1000 }}
      >
        {successModalData && (
          <div>
            <p style={{ marginBottom: 12, fontSize: 16, fontWeight: 500, color: '#52c41a' }}>
              ✓ Semester created successfully!
            </p>
            <div style={{ 
              marginTop: 16, 
              padding: '12px 16px', 
              background: '#f6ffed', 
              borderRadius: 4,
              border: '1px solid #b7eb8f'
            }}>
              <p style={{ margin: '6px 0', color: '#595959' }}>
                <strong style={{ color: '#262626' }}>Semester Name:</strong> {successModalData.semesterName}
              </p>
              <p style={{ margin: '6px 0', color: '#595959' }}>
                <strong style={{ color: '#262626' }}>Semester Code:</strong> 
                <span style={{ 
                  marginLeft: 8, 
                  padding: '2px 8px', 
                  background: '#e6f7ff', 
                  borderRadius: 3,
                  color: '#1890ff',
                  fontWeight: 500
                }}>
                  {successModalData.semesterCode}
                </span>
              </p>
              <p style={{ margin: '6px 0', color: '#595959' }}>
                <strong style={{ color: '#262626' }}>Duration:</strong> {successModalData.startDateFormatted} - {successModalData.endDateFormatted}
              </p>
              <p style={{ margin: '6px 0', color: '#595959' }}>
                <strong style={{ color: '#262626' }}>Length:</strong> {successModalData.duration} days
              </p>
              {successModalData.holidayCount > 0 && !successModalData.warning && (
                <p style={{ 
                  marginTop: 12, 
                  padding: '8px 12px', 
                  background: '#e6f7ff', 
                  borderRadius: 4, 
                  color: '#1890ff',
                  border: '1px solid #91d5ff'
                }}>
                  ✓ Added {successModalData.holidayCount} holidays
                </p>
              )}
              {successModalData.warning && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '12px 16px', 
                  background: '#fff7e6', 
                  borderRadius: 4, 
                  border: '1px solid #ffd591'
                }}>
                  <p style={{ margin: 0, color: '#d46b08', fontSize: 14 }}>
                    ⚠️ Warning: {successModalData.warning}
                  </p>
                  <p style={{ margin: '8px 0 0 0', color: '#595959', fontSize: 13 }}>
                    Semester created successfully, but you may need to create holidays manually.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Error Modal */}
      <Modal
        title="Failed to Create Semester"
        open={errorModalVisible}
        onCancel={() => {
          setErrorModalVisible(false);
          setCurrentStep(0);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setErrorModalVisible(false);
            setCurrentStep(0);
          }}>
            Close
          </Button>
        ]}
        width={600}
        centered
        maskClosable={false}
        style={{ zIndex: 1000 }}
      >
        {errorModalData && (
          <div>
            <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 500, color: '#ff4d4f' }}>
              {errorModalData.errorMsg}
            </p>
            {errorModalData.errorDetails && (
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                background: '#fff2f0', 
                borderRadius: 4,
                border: '1px solid #ffccc7'
              }}>
                <pre style={{ 
                  margin: 0,
                  fontSize: 13,
                  maxHeight: 250,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#595959',
                  fontFamily: 'inherit'
                }}>
                  {errorModalData.errorDetails}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  );
}
