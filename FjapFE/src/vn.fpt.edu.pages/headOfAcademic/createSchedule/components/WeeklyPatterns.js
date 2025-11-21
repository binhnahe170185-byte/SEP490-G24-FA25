import React from 'react';
import {
  Card,
  Form,
  Select,
  Button,
  Space,
  List,
  Tag,
  Empty,
  Tooltip,
  Typography,
  Alert,
  Spin
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const WeeklyPatterns = ({
  weekday,
  slotId,
  roomId,
  patterns = [],
  weekdays = [],
  slots = [],
  rooms = [],
  weekdayMap = {},
  onWeekdayChange,
  onSlotChange,
  onRoomChange,
  onAddPattern, 
  onRemovePattern,
  pendingAvailability,
  filteringOptions = false
}) => {
  const hasValues = weekday && slotId && roomId;
const availabilityState = pendingAvailability || {};
  const isChecking = availabilityState.status === 'loading';
  const isUnavailable = availabilityState.hasConflict;
  const availabilityMessage = availabilityState.message;

  const addButtonDisabled = !hasValues || isUnavailable || isChecking;
  const addButtonTooltip = !hasValues
    ? 'Select weekday, slot & room'
    : isChecking
      ? 'Checking slot availability...'
      : isUnavailable
        ? availabilityMessage || 'This slot is not available'
        : 'Add pattern';
  const getRoomLabel = (roomValue) => {
    const room = rooms.find(r => String(r.value) === String(roomValue));
    return room?.label || roomValue;
  };

  return (
    <Card
      title="Weekly Patterns"
      className="create-schedule-card"
      extra={
        <Tooltip title={addButtonTooltip}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddPattern}
              disabled={addButtonDisabled}
          >
            Add pattern
          </Button>
        </Tooltip>
      }
    >
      {(isChecking || filteringOptions) && (
        <Alert
          message={filteringOptions ? "Filtering valid options..." : "Checking availability..."}
          type="info"
          icon={<Spin size="small" />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {availabilityMessage && !isChecking && (
        <Alert
          message={availabilityMessage}
          type={isUnavailable ? 'error' : 'success'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form layout="vertical">
        <Space
          direction="horizontal"
          size="large"
          wrap
          className="create-schedule-space-responsive"
        >
          <Form.Item label="Weekday" style={{ minWidth: 200 }}>
            <Select
              value={weekday || undefined}
              onChange={onWeekdayChange}
              placeholder="Select weekday"
              options={weekdays}
              allowClear
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>

          <Form.Item label="Slot" style={{ minWidth: 200 }}>
            <Select
              value={slotId || undefined}
              onChange={onSlotChange}
              placeholder="Select slot"
              options={slots}
              allowClear
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>

          <Form.Item label="Room" style={{ minWidth: 200 }}>
            <Select
              value={roomId || undefined}
              onChange={onRoomChange}
              placeholder="Select room"
              options={rooms}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={filteringOptions}
              notFoundContent={filteringOptions ? <Spin size="small" /> : null}
            />
          </Form.Item>
        </Space>
      </Form>

      <List
        header="Pending patterns"
        dataSource={patterns}
        locale={{ emptyText: <Empty description="No patterns yet" /> }}
        renderItem={(pattern, idx) => (
          <List.Item
            actions={[
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onRemovePattern(idx)}
              >
                Remove
              </Button>
            ]}
          >
            <Space size="small" wrap>
              <Tag color="blue">{weekdayMap[pattern.weekday] || pattern.weekday}</Tag>
              <Tag color="green">Slot {pattern.slot}</Tag>
              <Tag color="purple">Room {getRoomLabel(pattern.room)}</Tag>
            </Space>
          </List.Item>
        )}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
};

export default WeeklyPatterns;

