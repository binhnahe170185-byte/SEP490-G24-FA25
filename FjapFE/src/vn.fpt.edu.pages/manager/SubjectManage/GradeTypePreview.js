// Suggested path: src/vn.fpt.edu.components/GradeTypePreview.js
import React from 'react';
import { Card, Progress, Tag, Empty } from 'antd';
import { getWeightColor, calculateTotalWeight } from '../vn.fpt.edu.utils/SubjectValidationUtils';

/**
 * Component to preview grade type distribution
 * @param {Array} gradeTypes - Array of grade type objects
 * @param {boolean} showTotal - Whether to show total weight
 */
export default function GradeTypePreview({ gradeTypes = [], showTotal = true }) {
  if (!gradeTypes || gradeTypes.length === 0) {
    return (
      <Empty 
        description="No grade components defined" 
        style={{ padding: '20px 0' }}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const totalWeight = calculateTotalWeight(gradeTypes);
  const isValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div>
      {showTotal && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: isValid ? '#f6ffed' : '#fff2e8',
          border: `1px solid ${isValid ? '#b7eb8f' : '#ffbb96'}`,
          borderRadius: 4,
          textAlign: 'center'
        }}>
          <strong style={{ color: isValid ? '#52c41a' : '#fa541c' }}>
            {isValid ? '✓' : '⚠'} Total Weight: {totalWeight.toFixed(2)}%
          </strong>
        </div>
      )}

      <div style={{ 
        display: 'grid', 
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))'
      }}>
        {gradeTypes.map((gt, index) => {
          const weight = parseFloat(gt.weight) || 0;
          return (
            <Card
              key={index}
              size="small"
              style={{ 
                borderRadius: 6,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
              bodyStyle={{ padding: 12 }}
            >
              <div style={{ marginBottom: 8 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6
                }}>
                  <strong style={{ fontSize: 14 }}>
                    {gt.gradeTypeName || `Grade Type ${index + 1}`}
                  </strong>
                  <Tag color={getWeightColor(weight)}>
                    {weight.toFixed(1)}%
                  </Tag>
                </div>
                <Progress 
                  percent={weight} 
                  strokeColor={getWeightColor(weight)}
                  showInfo={false}
                  size="small"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}