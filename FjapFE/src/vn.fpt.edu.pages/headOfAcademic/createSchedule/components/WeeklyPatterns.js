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
  onRemovePattern
}) => {
  const hasValues = weekday && slotId && roomId;

  const getRoomLabel = (roomValue) => {
    const room = rooms.find(r => String(r.value) === String(roomValue));
    return room?.label || roomValue;
  };

  return (
    <Card
      title="Weekly Patterns"
      className="create-schedule-card"
      extra={
        <Tooltip title={hasValues ? 'Add pattern' : 'Select weekday, slot & room'}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onAddPattern}
            disabled={!hasValues}
          >
            Add pattern
          </Button>
        </Tooltip>
      }
    >
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
            />
          </Form.Item>

          <Form.Item label="Slot" style={{ minWidth: 200 }}>
            <Select
              value={slotId || undefined}
              onChange={onSlotChange}
              placeholder="Select slot"
              options={slots}
              allowClear
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

