import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Spin, message, Descriptions, Tag, List, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import SubjectListApi from '../../../vn.fpt.edu.api/SubjectList';

export default function SubjectDetail() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    SubjectListApi.getById(subjectId)
      .then(data => {
        setSubject(data);
      })
      .catch(() => message.error("Could not load subject details."))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!subject) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Subject not found.</div>;
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/manager/subject')} type="text" />
          <span>Subject Details</span>
        </div>
      }
      style={{ maxWidth: 900, margin: '24px auto' }}
    >
      <Descriptions bordered column={1} labelStyle={{ fontWeight: 'bold' }}>
        <Descriptions.Item label="Subject Code">{subject.subjectCode}</Descriptions.Item>
        <Descriptions.Item label="Subject Name">{subject.subjectName}</Descriptions.Item>
        <Descriptions.Item label="Level">{subject.levelName}</Descriptions.Item>
        <Descriptions.Item label="Pass Mark">{subject.passMark}</Descriptions.Item>
        <Descriptions.Item label="Status">
          <Tag color={subject.status === 'Active' ? 'green' : 'red'}>{subject.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Description">{subject.description || 'N/A'}</Descriptions.Item>
      </Descriptions>

      {subject.gradeTypes && subject.gradeTypes.length > 0 && (
        <List
          header={<div style={{ fontWeight: 'bold', fontSize: '16px', marginTop: '24px' }}>Grade Components</div>}
          bordered
          dataSource={subject.gradeTypes}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta title={item.gradeTypeName} />
              <div>{item.weight}%</div>
            </List.Item>
          )}
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );
}