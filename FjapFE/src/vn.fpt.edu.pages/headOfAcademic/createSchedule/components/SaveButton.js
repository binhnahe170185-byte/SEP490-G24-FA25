import React from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const SaveButton = ({ onSave, saving = false, disabled = false, disabledReason = '' }) => {
  const handleClick = (e) => {
    if (onSave && typeof onSave === 'function') {
      onSave(e);
    } else {
      console.error('onSave is not a function!', onSave);
    }
  };

  return (
    <Card className="create-schedule-card">
      <Space direction="vertical" style={{ width: '100%' }} align="center">
        <Typography.Text type="secondary">
          Review conflicts before saving the timetable.
        </Typography.Text>
        {disabled && disabledReason && (
          <Typography.Text type="danger">{disabledReason}</Typography.Text>
        )}
        <Button
          type="primary"
          size="large"
          icon={<SaveOutlined />}
          onClick={handleClick}
          loading={saving}
          disabled={disabled || saving}
        >
          {saving ? 'Đang lưu...' : 'Save timetable'}
        </Button>
      </Space>
    </Card>
  );
};

export default SaveButton;

