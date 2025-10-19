import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Spin, message, Descriptions, Tag, Button, 
  Progress, Empty, Divider 
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
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
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        Subject not found.
      </div>
    );
  }

  const totalWeight = subject.gradeTypes?.reduce((sum, gt) => sum + (gt.weight || 0), 0) || 0;
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/manager/subject')} 
            type="text" 
          />
          <span>Subject Details</span>
        </div>
      }
      extra={
        <Button 
          type="primary" 
          icon={<EditOutlined />}
          onClick={() => navigate(`/manager/subject/edit/${subjectId}`)}
        >
          Edit Subject
        </Button>
      }
      style={{ maxWidth: 1000, margin: '24px auto' }}
    >
      {/* Basic Information */}
      <Descriptions 
        bordered 
        column={2} 
        labelStyle={{ fontWeight: 'bold', width: '200px' }}
      >
        <Descriptions.Item label="Subject Code" span={1}>
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
            {subject.subjectCode}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Subject Name" span={1}>
          <strong style={{ fontSize: 15 }}>{subject.subjectName}</strong>
        </Descriptions.Item>
        <Descriptions.Item label="Level" span={1}>
          {subject.levelName}
        </Descriptions.Item>
        <Descriptions.Item label="Pass Mark" span={1}>
          <Tag color="green">{subject.passMark} / 10</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Status" span={1}>
          <Tag color={subject.status === 'Active' ? 'green' : 'red'}>
            {subject.status}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Created At" span={1}>
          {subject.createdAt 
            ? new Date(subject.createdAt).toLocaleDateString('vi-VN')
            : 'N/A'}
        </Descriptions.Item>
        <Descriptions.Item label="Description" span={2}>
          {subject.description || <i style={{ color: '#999' }}>No description</i>}
        </Descriptions.Item>
      </Descriptions>

      <Divider style={{ marginTop: 32, marginBottom: 24 }} />

      {/* Grade Components Section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16 
        }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>
            Grade Components Distribution
          </h3>
          <Tag color={isWeightValid ? 'success' : 'error'} style={{ fontSize: 14 }}>
            Total: {totalWeight.toFixed(2)}% / 100%
          </Tag>
        </div>

        {subject.gradeTypes && subject.gradeTypes.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
          }}>
            {subject.gradeTypes.map((gt, index) => (
              <Card
                key={index}
                size="small"
                style={{ 
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <strong style={{ fontSize: 15 }}>{gt.gradeTypeName}</strong>
                    <Tag color="blue">{gt.weight}%</Tag>
                  </div>
                  <Progress 
                    percent={gt.weight} 
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    showInfo={false}
                  />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty 
            description="No grade components defined"
            style={{ padding: '40px 0' }}
          />
        )}

        {!isWeightValid && subject.gradeTypes?.length > 0 && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#fff2e8', 
            border: '1px solid #ffbb96',
            borderRadius: 4 
          }}>
            <strong style={{ color: '#fa541c' }}>⚠️ Warning:</strong>
            <span style={{ marginLeft: 8, color: '#595959' }}>
              Total weight does not equal 100%. Please update the grade components.
            </span>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{ 
        marginTop: 24, 
        padding: 16, 
        background: '#f0f5ff', 
        borderRadius: 8,
        border: '1px solid #adc6ff'
      }}>
        <strong style={{ color: '#1890ff' }}>ℹ️ Grade Calculation:</strong>
        <p style={{ margin: '8px 0 0 0', color: '#595959' }}>
          Final score is calculated based on the weighted average of all grade components. 
          Students must achieve at least <strong>{subject.passMark}/10</strong> to pass this subject.
        </p>
      </div>
    </Card>
  );
}