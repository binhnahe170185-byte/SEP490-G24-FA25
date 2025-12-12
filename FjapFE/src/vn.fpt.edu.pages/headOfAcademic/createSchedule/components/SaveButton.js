import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const SaveButton = ({ onSave, saving = false, disabled = false, disabledReason = '' }) => {
  // Local state to immediately disable button on click (before parent state updates)
  const [isClicking, setIsClicking] = useState(false);
  // Ref to prevent multiple rapid clicks - SYNC CHECK để tránh race condition
  const isProcessingRef = useRef(false);
  const clickTimeoutRef = useRef(null);

  const handleClick = (e) => {
    // Chặn spam click ngay lập tức - check ref TRƯỚC (sync) để tránh race condition
    if (isProcessingRef.current || isClicking || saving) {
      console.log('Save button click ignored - already processing');
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Set ref NGAY LẬP TỨC (sync) để chặn các clicks tiếp theo
    isProcessingRef.current = true;
    // Set local state ngay lập tức để disable button (không đợi parent state update)
    setIsClicking(true);

    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    try {
      if (onSave && typeof onSave === 'function') {
        // Call onSave
        const result = onSave(e);

        // If onSave returns a promise, wait for it
        if (result && typeof result.then === 'function') {
          result.catch(() => {
            // Error handling is done in parent, just reset clicking state
          }).finally(() => {
            // Reset clicking state after save completes
            // Parent's saving state will handle the UI state
            clickTimeoutRef.current = setTimeout(() => {
              isProcessingRef.current = false;
              setIsClicking(false);
            }, 100);
          });
        } else {
          // If not a promise, reset after a short delay
          clickTimeoutRef.current = setTimeout(() => {
            isProcessingRef.current = false;
            setIsClicking(false);
          }, 100);
        }
      } else {
        console.error('onSave is not a function!', onSave);
        isProcessingRef.current = false;
        setIsClicking(false);
      }
    } catch (error) {
      console.error('Error in handleClick:', error);
      isProcessingRef.current = false;
      setIsClicking(false);
    }
  };

  // Reset clicking state when saving state changes to false
  useEffect(() => {
    if (!saving) {
      // Small delay to ensure state has fully updated
      const timer = setTimeout(() => {
        isProcessingRef.current = false;
        setIsClicking(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [saving]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Disable button if already processing or saving
  const isDisabled = disabled || saving || isClicking || isProcessingRef.current;

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
          loading={saving || isClicking}
          disabled={isDisabled}
        >
          {saving || isClicking ? 'Đang lưu...' : 'Save timetable'}
        </Button>
      </Space>
    </Card>
  );
};

export default SaveButton;

