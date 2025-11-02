import React from 'react';
import { Modal, Tag, Descriptions, Typography, Space } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

export default function MaterialDetail({ visible, record, onClose }) {
  if (!record) return null;

  const created = record.createdDate || record.created || record.createdAt || record.__raw?.created_at || null;
  const updated = record.updatedDate || record.updated || record.updatedAt || record.__raw?.updated_at || null;

  const formatDateDDMM = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(date.getDate());
      const month = pad(date.getMonth() + 1);
      const year = date.getFullYear();
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());
      return `${day}/${month}/${year} ${hour}:${minute}`;
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  return (
    <Modal title={`Detail Material ${record.id || record.materialId || ''}`} open={visible} onCancel={onClose} footer={null} width={820} bodyStyle={{ padding: 20 }}>
      <Descriptions column={1} bordered size="middle" labelStyle={{ fontWeight: 700, width: 160 }}>
        <Descriptions.Item label="Material Name">{record.title || record.name}</Descriptions.Item>
        <Descriptions.Item label="Creator">
          <Space direction="vertical">
            {record.creator ? (
              <Text copyable={{ text: record.creator }}>
                <a href={record.creator && String(record.creator).includes('@') ? `mailto:${record.creator}` : '#'}>{record.creator}</a>
              </Text>
            ) : '—'}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Subject Code">{record.subjectCode || record.subject || '—'}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={(record.status || '').toLowerCase() === 'active' ? 'blue' : 'volcano'} style={{ textTransform: 'capitalize' }}>{record.status || '—'}</Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Link">
          {record.filePath || record.link ? (
            <a href={record.filePath || record.link} target="_blank" rel="noreferrer">
              <LinkOutlined style={{ marginRight: 6 }} /> Open in Drive
            </a>
          ) : '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Created Date">{formatDateDDMM(created)}</Descriptions.Item>
        <Descriptions.Item label="Updated Date">{formatDateDDMM(updated)}</Descriptions.Item>

        <Descriptions.Item label="Description">
          <Paragraph style={{ background: '#fafafa', padding: 12, borderRadius: 6, margin: 0 }}>{record.description || 'No description'}</Paragraph>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

