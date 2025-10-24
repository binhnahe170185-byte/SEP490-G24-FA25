import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, Alert } from 'antd';

const { Option } = Select;

export default function CreateMaterialModal({ visible, onCancel, onCreate }) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState([]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const newItem = {
      id: `MAT${Math.floor(Math.random() * 9000) + 1000}`,
      name: values.name,
      subject: values.subject,
      creator: 'You',
      created: new Date().toISOString().slice(0,10),
      updated: new Date().toISOString().slice(0,10),
      link: values.link || '',
      status: values.status,
    };
    onCreate(newItem);
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
    <Modal title="Create New Material" open={visible} onOk={handleOk} onCancel={onCancel} okText="Save">
      <Form form={form} layout="vertical" onFinishFailed={onFinishFailed}>
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message="Form contains errors"
            description={errors.map((e, i) => <div key={i}>{e}</div>)}
            style={{ marginBottom: 12 }}
          />
        )}
        <Form.Item name="name" label="Material Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="subject" label="Subject Code" rules={[{ required: true }]}> 
          <Select>
            <Option value="JPD101">JPD101</Option>
            <Option value="JPD201">JPD201</Option>
          </Select>
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="link" label="Link">
          <Input />
        </Form.Item>
        <Form.Item name="status" label="Status" initialValue="Active">
          <Radio.Group>
            <Radio value="Active">Active</Radio>
            <Radio value="Inactive">Inactive</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
