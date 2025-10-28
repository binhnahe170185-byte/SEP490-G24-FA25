import React, { useState } from "react";
import { Card, Form, DatePicker, Input, Button, message, Space, Typography, Row, Col, Steps, Select, Checkbox, List, Tag } from "antd";
import { SaveOutlined, ArrowLeftOutlined, CalendarOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import SemesterApi from "../../vn.fpt.edu.api/Semester";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;

// Predefined holiday templates
const HOLIDAY_TEMPLATES = [
  { name: "New Year's Day", date: "01-01", type: "National", recurring: true },
  { name: "Tet Holiday", date: "01-01", type: "National", recurring: true },
  { name: "Independence Day", date: "09-02", type: "National", recurring: true },
  { name: "Christmas Day", date: "12-25", type: "Religious", recurring: true },
  { name: "Mid-Autumn Festival", date: "08-15", type: "Cultural", recurring: true },
];

export default function AddSemesterWithHolidays() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [holidays, setHolidays] = useState([]);
  const navigate = useNavigate();

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

  const addTemplateHoliday = (template) => {
    const semesterStart = form.getFieldValue('startDate');
    const semesterEnd = form.getFieldValue('endDate');
    
    if (!semesterStart || !semesterEnd) {
      message.warning("Please set semester dates first");
      return;
    }

    const year = semesterStart.year();
    const templateDate = dayjs(`${year}-${template.date}`);
    
    // Check if template date falls within semester
    if (templateDate.isAfter(semesterStart.subtract(1, 'day')) && templateDate.isBefore(semesterEnd.add(1, 'day'))) {
      const newHoliday = {
        id: Date.now(),
        name: template.name,
        date: templateDate,
        type: template.type,
        description: "",
        recurring: template.recurring,
      };
      setHolidays([...holidays, newHoliday]);
    } else {
      message.info(`${template.name} doesn't fall within this semester period`);
    }
  };

  const nextStep = async () => {
    if (currentStep === 0) {
      try {
        await form.validateFields(['name', 'startDate', 'endDate']);
        setCurrentStep(1);
      } catch (error) {
        message.error("Please fill in all required fields");
      }
    } else if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Frontend validation
      if (!values.name || values.name.trim().length < 3) {
        message.error('Semester name must be at least 3 characters long');
        setLoading(false);
        return;
      }

      if (!values.startDate || !values.endDate) {
        message.error('Please select both start and end dates');
        setLoading(false);
        return;
      }

      if (values.startDate.isAfter(values.endDate) || values.startDate.isSame(values.endDate)) {
        message.error('Start date must be before end date');
        setLoading(false);
        return;
      }

      // Check duration (30-365 days)
      const duration = values.endDate.diff(values.startDate, 'days');
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

      // Check start date is not too far in the past
      const minStartDate = dayjs().subtract(7, 'days');
      if (values.startDate.isBefore(minStartDate)) {
        message.error('Start date cannot be more than 7 days in the past');
        setLoading(false);
        return;
      }

      const payload = {
        name: values.name.trim(),
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
        holidays: holidays.filter(h => h.name && h.date).map(h => ({
          name: h.name.trim(),
          date: h.date.format("YYYY-MM-DD"),
          type: h.type,
          description: h.description?.trim() || '',
          IsRecurring: h.recurring,
        }))
      };

      const response = await SemesterApi.createSemester(payload);
      message.success("Semester created successfully");
      
      navigate("/staffOfAdmin", { state: { activeTab: "sem:list" } });
    } catch (error) {
      console.error("Error creating semester:", error);
      
      // Handle form validation errors
      if (error.errorFields) {
        message.error('Please fix the form errors before submitting');
        setLoading(false);
        return;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          'Failed to create semester';
      message.error(errorMessage);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/staffOfAdmin", { state: { activeTab: "sem:list" } });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            form={form}
            layout="vertical"
            style={{ maxWidth: 600 }}
          >
            <Form.Item
              label="Semester Name"
              name="name"
              rules={[
                { required: true, message: "Please enter semester name" },
                { min: 3, message: "Semester name must be at least 3 characters" },
                { max: 100, message: "Semester name cannot exceed 100 characters" },
                { 
                  pattern: /^[A-Za-z0-9\s\-_]+$/, 
                  message: "Semester name can only contain letters, numbers, spaces, hyphens, and underscores" 
                }
              ]}
            >
              <Input placeholder="e.g., Fall Semester 2024-2025" />
            </Form.Item>

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
                        
                        // Check if start date is not too far in the past (7 days)
                        const minDate = dayjs().subtract(7, 'days');
                        if (value.isBefore(minDate)) {
                          return Promise.reject(new Error('Start date cannot be more than 7 days in the past'));
                        }
                        
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    style={{ width: "100%" }} 
                    disabledDate={(current) => {
                      // Disable dates more than 7 days in the past
                      const minDate = dayjs().subtract(7, 'days');
                      return current && current.isBefore(minDate);
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
                        
                        // Check if end date is after start date
                        if (value.isSame(startDate) || value.isBefore(startDate)) {
                          return Promise.reject(new Error('End date must be after start date'));
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
                      const startDate = form.getFieldValue('startDate');
                      if (!startDate) return false;
                      
                      // Disable dates before or same as start date
                      if (current && (current.isSame(startDate) || current.isBefore(startDate))) {
                        return true;
                      }
                      
                      // Disable dates more than 365 days after start date
                      const maxDate = startDate.add(365, 'days');
                      if (current && current.isAfter(maxDate)) {
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
        return (
          <div style={{ maxWidth: 800 }}>
            <div style={{ marginBottom: 24 }}>
              <Title level={4}>Add Holidays</Title>
              <Text type="secondary">Select non-working days for this semester</Text>
            </div>

            {/* Template Holidays */}
            <Card title="Quick Add Templates" style={{ marginBottom: 24 }}>
              <Space wrap>
                {HOLIDAY_TEMPLATES.map((template, index) => (
                  <Button
                    key={index}
                    size="small"
                    onClick={() => addTemplateHoliday(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </Space>
            </Card>

            {/* Custom Holidays */}
            <Card 
              title="Custom Holidays" 
              extra={
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={addHoliday}
                >
                  Add Holiday
                </Button>
              }
            >
              <List
                dataSource={holidays}
                renderItem={(holiday) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />}
                        onClick={() => removeHoliday(holiday.id)}
                      />
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Input
                          placeholder="Holiday name"
                          value={holiday.name}
                          onChange={(e) => updateHoliday(holiday.id, 'name', e.target.value)}
                          style={{ width: 200 }}
                          status={holiday.name && holiday.name.length < 2 ? 'error' : ''}
                        />
                      }
                      description={
                        <Space>
                          <DatePicker
                            placeholder="Select date"
                            value={holiday.date}
                            onChange={(date) => updateHoliday(holiday.id, 'date', date)}
                            disabledDate={(current) => {
                              const startDate = form.getFieldValue('startDate');
                              const endDate = form.getFieldValue('endDate');
                              
                              if (!startDate || !endDate) return false;
                              
                              // Disable dates outside semester range
                              return current && (current.isBefore(startDate) || current.isAfter(endDate));
                            }}
                          />
                          <Select
                            value={holiday.type}
                            onChange={(value) => updateHoliday(holiday.id, 'type', value)}
                            style={{ width: 120 }}
                          >
                            <Option value="National">National</Option>
                            <Option value="Religious">Religious</Option>
                            <Option value="Cultural">Cultural</Option>
                            <Option value="Custom">Custom</Option>
                          </Select>
                          <Input
                            placeholder="Description (optional)"
                            value={holiday.description || ''}
                            onChange={(e) => updateHoliday(holiday.id, 'description', e.target.value)}
                            style={{ width: 200 }}
                            maxLength={500}
                          />
                          <Checkbox
                            checked={holiday.recurring}
                            onChange={(e) => updateHoliday(holiday.id, 'recurring', e.target.checked)}
                          >
                            Recurring
                          </Checkbox>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </div>
        );

      case 2:
        const formValues = form.getFieldsValue();
        return (
          <div style={{ maxWidth: 600 }}>
            <Title level={4}>Review Semester Details</Title>
            
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div><strong>Name:</strong> {formValues.name}</div>
                <div><strong>Start Date:</strong> {formValues.startDate?.format("YYYY-MM-DD")}</div>
                <div><strong>End Date:</strong> {formValues.endDate?.format("YYYY-MM-DD")}</div>
                <div><strong>Duration:</strong> {formValues.endDate?.diff(formValues.startDate, 'days')} days</div>
              </Space>
            </Card>

            {holidays.length > 0 && (
              <Card title="Holidays">
                <List
                  dataSource={holidays}
                  renderItem={(holiday) => (
                    <List.Item>
                      <Space>
                        <Text strong>{holiday.name}</Text>
                        <Tag color="blue">{holiday.date?.format("YYYY-MM-DD")}</Tag>
                        <Tag color="green">{holiday.type}</Tag>
                        {holiday.recurring && <Tag color="orange">Recurring</Tag>}
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card style={{ borderRadius: 12, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ marginBottom: 24 }}>
        <Space align="center" style={{ marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleCancel}
            style={{ marginRight: 8 }}
          >
            Back to Semester List
          </Button>
          <Title level={3} style={{ margin: 0 }}>Add New Semester</Title>
        </Space>
      </div>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

      {renderStepContent()}

      <div style={{ marginTop: 32, textAlign: "right" }}>
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
    </Card>
  );
}
