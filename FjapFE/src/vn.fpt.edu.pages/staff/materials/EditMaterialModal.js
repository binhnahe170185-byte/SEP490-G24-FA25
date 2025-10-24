import React, { useState } from 'react';
import { Modal, Form, Input, Select, Radio, Alert } from 'antd';

const { Option } = Select;

export default function EditMaterialModal({ visible, record, onCancel, onSave }) {
  const [form] = Form.useForm();
  const [errors, setErrors] = useState([]);

  React.useEffect(() => {
    if (record) form.setFieldsValue({ name: record.name, subject: record.subject, description: record.description, status: record.status, link: record.link });
  }, [record, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSave({ ...record, ...values, updated: new Date().toISOString().slice(0,10) });
    form.resetFields();
  };

  const onFinishFailed = ({ errorFields }) => {
    const list = (errorFields || []).map((f) => {
      const name = Array.isArray(f.name) ? f.name.join('.') : f.name;
      return `${name}: ${f.errors.join(', ')}`;
    });
    setErrors(list);
    if (errorFields && errorFields.length) {
      try { form.scrollToField(errorFields[0].name); } catch (e) {}
    }
  };

  return (
    <Modal title="Edit Material" open={visible} onOk={handleOk} onCancel={onCancel} okText="Save">
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
