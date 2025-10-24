import React from 'react';
import { Modal, Tag } from 'antd';

export default function MaterialDetail({ visible, record, onClose }) {
  if (!record) return null;

  return (
    <Modal title={`Detail Material ${record.id}`} open={visible} onCancel={onClose} footer={null} width={800}>
      <div style={{ padding: 8 }}>
        <div><strong>Material Name</strong>: {record.name}</div>
        <div><strong>Creator</strong>: {record.creator}</div>
        <div><strong>Subject Code</strong>: {record.subject}</div>
        <div style={{ marginTop: 8 }}><strong>Status</strong>: <Tag color={record.status === 'Active' ? 'blue' : 'volcano'}>{record.status}</Tag></div>
        <div style={{ marginTop: 12 }}>
          <strong>Link</strong>: {record.link ? <a href={record.link} target="_blank" rel="noreferrer">Open in Drive</a> : '—'}
        </div>
        <div style={{ marginTop: 12 }}><strong>Description</strong></div>
        <div style={{ marginTop: 8, background: '#fafafa', padding: 12, borderRadius: 6 }}>{record.description || 'No description'}</div>
      </div>
    </Modal>
  );
}
