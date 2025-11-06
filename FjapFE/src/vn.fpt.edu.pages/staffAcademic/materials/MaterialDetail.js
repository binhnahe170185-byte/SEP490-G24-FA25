import React from 'react';
import { Modal, Tag, Descriptions, Typography, Space } from 'antd';
import { LinkOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

export default function MaterialDetail({ visible, record, onClose }) {
  if (!record) return null;

  const created = record.createdDate || record.created || record.createdAt || record.__raw?.created_at || null;
  const updated = record.updatedDate || record.updated || record.updatedAt || record.__raw?.updated_at || null;
  
  // Chỉ hiển thị Updated At/By nếu thực sự có cập nhật (khác với Created At)
  const hasBeenUpdated = (() => {
    if (!created || !updated) return false;
    try {
      const createdDate = new Date(created);
      const updatedDate = new Date(updated);
      // So sánh thời gian (bỏ qua milliseconds)
      return Math.abs(updatedDate.getTime() - createdDate.getTime()) > 1000; // Chênh lệch > 1 giây
    } catch {
      return false;
    }
  })();
  // Cố gắng lấy email của người cập nhật nếu có
  const updatedByRaw =
    record.updatedByEmail || record.updateByEmail ||
    record.updateByName || record.updateBy ||
    record.updatedByName || record.updatedBy ||
    record.__raw?.UpdatedByEmail || record.__raw?.updatedByEmail ||
    record.__raw?.UpdaterEmail || record.__raw?.updaterEmail ||
    record.__raw?.UpdatedBy || record.__raw?.updatedBy ||
    record.__raw?.UpdatedByName || record.__raw?.updatedByName ||
    null;
  const updatedBy = (typeof updatedByRaw === 'string' && updatedByRaw.includes('@')) ? updatedByRaw : null;

  // Fallback: nếu backend chỉ trả id (ví dụ 14), thử map sang email của current user nếu trùng id
  const parseMaybeNumber = (v) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const getCurrentUserFromStorage = () => {
    try {
      const token = localStorage.getItem('token');
      let email = null;
      let userId = null;
      if (token && token.includes('.')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          email = payload?.email ?? payload?.Email ?? email;
          userId = parseMaybeNumber(payload?.sub ?? payload?.userId ?? payload?.UserId);
        } catch {}
      }
      // Fallback từ profile
      const profileStr = localStorage.getItem('profile');
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          email = email ?? profile?.email ?? profile?.user?.email ?? profile?.user?.Email ?? null;
          userId = userId ?? parseMaybeNumber(
            profile?.accountId ?? profile?.account_id ?? profile?.userId ?? profile?.user_id ?? profile?.user?.userId ?? profile?.user?.accountId
          );
        } catch {}
      }
      return { email, userId };
    } catch {
      return { email: null, userId: null };
    }
  };

  let updatedByEmail = updatedBy;
  if (!updatedByEmail) {
    const numericUpdatedBy = parseMaybeNumber(updatedByRaw);
    if (numericUpdatedBy !== null) {
      const { email, userId } = getCurrentUserFromStorage();
      if (userId !== null && numericUpdatedBy === userId && email) {
        updatedByEmail = email;
      }
    }
  }

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

        <Descriptions.Item label="Created At">{formatDateDDMM(created)}</Descriptions.Item>
        {hasBeenUpdated && (
          <>
            <Descriptions.Item label="Updated At">{formatDateDDMM(updated)}</Descriptions.Item>
            <Descriptions.Item label="Updated By">
              <Space direction="vertical">
                {updatedByEmail ? (
                  <Text copyable={{ text: updatedByEmail }}>
                    <a href={`mailto:${updatedByEmail}`}>{updatedByEmail}</a>
                  </Text>
                ) : '—'}
              </Space>
            </Descriptions.Item>
          </>
        )}

        <Descriptions.Item label="Description">
          <Paragraph style={{ background: '#fafafa', padding: 12, borderRadius: 6, margin: 0 }}>{record.description || 'No description'}</Paragraph>
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}

