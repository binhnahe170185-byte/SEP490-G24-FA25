import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Alert } from 'antd';
import { getSubjects } from '../../../vn.fpt.edu.api/Material';

const { Option } = Select;

export default function CreateMaterialModal({ visible, onCancel, onCreate }) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const subjectsData = await getSubjects();
        console.log('CreateMaterialModal - Subjects loaded:', subjectsData);
        setSubjects(subjectsData || []);
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      } finally {
        setSubjectsLoading(false);
      }
    };

    if (visible) {
      fetchSubjects();
      setHasValidationErrors(false);
      setErrors([]);
      setSubmitting(false);
    } else {
      form.resetFields();
      setSubmitting(false);
    }
  }, [visible, form]);

  const handleOk = async () => {
    // Prevent double submission
    if (submitting) {
      return;
    }

    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await onCreate(values);
      form.resetFields();
      setErrors([]);
    } catch (err) {
      if (err && err.errorFields) {
        const list = (err.errorFields || []).map((f) => {
          const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
          return `${name}: ${f.errors.join(', ')}`;
        });
        setErrors(list);
        try { form.scrollToField(err.errorFields[0].name); } catch (e) {}
        setSubmitting(false);
        return;
      }
      const apiMsg = err?.response?.data?.message || err?.message || 'An error occurred while saving';
      setErrors([apiMsg]);
      setSubmitting(false);
    }
  };

  const onFinishFailed = ({ errorFields }) => {
    // build readable messages
    const list = (errorFields || []).map((f) => {
      const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
      return `${name}: ${f.errors.join(', ')}`;
    });
    setErrors(list);
    setHasValidationErrors(errorFields && errorFields.length > 0);
    if (errorFields && errorFields.length) {
      // scroll to first field with error
      try { form.scrollToField(errorFields[0].name); } catch (e) {}
    }
  };

  const checkFormErrors = async () => {
    try {
      await form.validateFields();
      setHasValidationErrors(false);
      setErrors([]);
    } catch (err) {
      if (err && err.errorFields) {
        setHasValidationErrors(err.errorFields.length > 0);
      }
    }
  };

  const handleValuesChange = () => {
    // Validate real-time when values change
    setTimeout(() => {
      checkFormErrors();
    }, 100);
  };

  return (
    <Modal 
      title="Create Material" 
      open={visible} 
      onOk={handleOk} 
      onCancel={onCancel} 
      okText="Create"
      okButtonProps={{ disabled: hasValidationErrors || submitting, loading: submitting }}
      width={800}
      bodyStyle={{ padding: '24px' }}
      maskClosable={!submitting}
      closable={!submitting}
    >
      <Form form={form} layout="vertical" onFinishFailed={onFinishFailed} onValuesChange={handleValuesChange}>
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Please check the information"
            description={errors.map((e, i) => <div key={i}>{e}</div>)}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item 
          name="name" 
          label="Material Name" 
          rules={[
            { required: true, message: 'Please enter material name' },
            { min: 3, message: 'Material name must be at least 3 characters' },
            { max: 200, message: 'Material name must not exceed 200 characters' },
            { whitespace: true, message: 'Material name cannot be only whitespace' }
          ]}
        >
          <Input 
            size="large" 
            placeholder="Enter material name..." 
            maxLength={200}
            showCount
          />
        </Form.Item>
        <Form.Item 
          name="subject" 
          label="Subject Code" 
          rules={[{ required: true, message: 'Please select subject code' }]}
        > 
          <Select 
            size="large" 
            placeholder="Select or type subject code..." 
            loading={subjectsLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
            allowClear
            notFoundContent="No subjects found"
          >
            {subjects.map((s) => (
              <Option key={s.subjectId || s.id} value={s.subjectId || s.id}>
                {s.subjectCode || s.code}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item 
          name="description" 
          label="Description"
          rules={[
            { required: true, message: 'Please enter description' },
            { min: 10, message: 'Description must be at least 10 characters' },
            { max: 1000, message: 'Description must not exceed 1000 characters' },
            { whitespace: true, message: 'Description cannot be only whitespace' }
          ]}
        >
          <Input.TextArea 
            rows={6} 
            placeholder="Enter detailed description about material..."
            style={{ resize: 'vertical' }}
            maxLength={1000}
            showCount
          />
        </Form.Item>
        <Form.Item 
          name="link" 
          label="Material Link"
          rules={[
            { required: true, message: 'Please enter material link' },
            { type: 'url', message: 'Please enter valid URL' },
            { pattern: /^https?:\/\//i, message: 'URL must start with http:// or https://' },
            { max: 500, message: 'URL must not exceed 500 characters' }
          ]}
        >
          <Input 
            size="large" 
            placeholder="https://drive.google.com/drive/folders/..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
