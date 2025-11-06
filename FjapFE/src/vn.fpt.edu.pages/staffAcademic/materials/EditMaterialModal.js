import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, Select, Alert } from 'antd';
import { getSubjects } from '../../../vn.fpt.edu.api/Material';

const { Option } = Select;

export default function EditMaterialModal({ visible, record, onCancel, onSave }) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  const checkFormErrors = useCallback(async () => {
    try {
      await form.validateFields();
      setHasValidationErrors(false);
      setErrors([]);
    } catch (err) {
      if (err && err.errorFields) {
        setHasValidationErrors(err.errorFields.length > 0);
      }
    }
  }, [form]);

  React.useEffect(() => {
    if (record) {
      form.setFieldsValue({ 
        name: record.title || record.name, 
        subject: record.subjectId || (record.Subject && record.Subject.subjectId) || (record.subject && record.subject.subjectId) || record.subjectId,
        description: record.description, 
        status: record.status, 
        link: record.filePath || record.link 
      });
      // Validate after setting values
      setTimeout(() => {
        checkFormErrors();
      }, 100);
    }
  }, [record, form, checkFormErrors]);

  React.useEffect(() => {
    if (visible) {
      setHasValidationErrors(false);
      setErrors([]);
    } else {
      form.resetFields();
    }
  }, [visible, form]);

  useEffect(() => {
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const subjectsData = await getSubjects();
        console.log('EditMaterialModal - Subjects loaded:', subjectsData);
        setSubjects(subjectsData || []);
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
      } finally {
        setSubjectsLoading(false);
      }
    };

    if (visible) {
      fetchSubjects();
    }
  }, [visible]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSave(values);
      form.resetFields();
      setErrors([]);
    } catch (err) {
      // Validation errors from antd
      if (err && err.errorFields) {
        const list = (err.errorFields || []).map((f) => {
          const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
          return `${name}: ${f.errors.join(', ')}`;
        });
        setErrors(list);
        try { form.scrollToField(err.errorFields[0].name); } catch (e) {}
        return; // Do not call backend
      }
      // Backend or unexpected error
      const apiMsg = err?.response?.data?.message || err?.message || 'An error occurred while saving';
      setErrors([apiMsg]);
    }
  };

  const onFinishFailed = ({ errorFields }) => {
    const list = (errorFields || []).map((f) => {
      const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
      return `${name}: ${f.errors.join(', ')}`;
    });
    setErrors(list);
    setHasValidationErrors(errorFields && errorFields.length > 0);
    if (errorFields && errorFields.length) {
      try { form.scrollToField(errorFields[0].name); } catch (e) {}
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
      title="Edit Material" 
      open={visible} 
      onOk={handleOk} 
      onCancel={onCancel} 
      okText="Save"
      okButtonProps={{ disabled: hasValidationErrors }}
      width={800}
      bodyStyle={{ padding: '24px' }}
    >
      <Form form={form} layout="vertical" onFinishFailed={onFinishFailed} onValuesChange={handleValuesChange}>
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Vui lòng kiểm tra lại thông tin"
            description={errors.map((e, i) => <div key={i}>{e}</div>)}
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item 
          name="name" 
          label="Material Name" 
          rules={[{ required: true, message: 'Please enter material name' }]}
        >
          <Input size="large" placeholder="Enter material name..." />
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
          rules={[{ required: true, message: 'Please enter description' }]}
        >
          <Input.TextArea 
            rows={6} 
            placeholder="Enter detailed description about material..."
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
        <Form.Item 
          name="link" 
          label="Material Link"
          rules={[
            { required: true, message: 'Please enter material link' },
            { type: 'url', message: 'Please enter valid URL' },
            { pattern: /^https?:\/\//i, message: 'URL must start with http:// or https://' }
          ]}
        >
          <Input 
            size="large" 
            placeholder="https://drive.google.com/drive/folders/..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
