import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Alert } from 'antd';
import { getSubjects } from '../../../vn.fpt.edu.api/Material';

const { Option } = Select;

export default function CreateMaterialModal({ visible, onCancel, onCreate }) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

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
    }
  }, [visible]);

  const handleOk = async () => {
    const values = await form.validateFields();
    // pass raw form values to parent; parent will call API
    onCreate(values);
    form.resetFields();
  };

  const onFinishFailed = ({ errorFields }) => {
    // build readable messages
    const list = (errorFields || []).map((f) => {
      const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
      return `${name}: ${f.errors.join(', ')}`;
    });
    setErrors(list);
    if (errorFields && errorFields.length) {
      // scroll to first field with error
      try { form.scrollToField(errorFields[0].name); } catch (e) {}
    }
  };

  return (
    <Modal 
      title="Tạo Material Mới" 
      open={visible} 
      onOk={handleOk} 
      onCancel={onCancel} 
      okText="Tạo"
      width={800}
      bodyStyle={{ padding: '24px' }}
    >
      <Form form={form} layout="vertical" onFinishFailed={onFinishFailed}>
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
            mode="combobox"
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
            { type: 'url', message: 'Please enter valid URL' }
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
