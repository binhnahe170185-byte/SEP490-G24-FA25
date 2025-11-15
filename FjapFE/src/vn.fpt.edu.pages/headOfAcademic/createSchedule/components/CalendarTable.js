import React from 'react';
import {
  Card,
  Space,
  Button,
  Tag,
  Tooltip,
  Typography,
  Table,
  Empty,
} from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import '../CreateSchedule.css';

const CalendarTable = ({
  title,
  weekStart,
  weekRange,
  onPrevWeek,
  onNextWeek,
  renderCalendar
}) => {
  const isNavigationDisabled = !weekStart;
  const { columns = [], dataSource = [] } = (renderCalendar && renderCalendar()) || {};

  return (
    <Card
      className="create-schedule-card"
      title={
        <Space size="small">
          <Typography.Text strong>{title}</Typography.Text>
          <Tag color="geekblue">{weekRange || 'Week'}</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Previous week">
            <Button
              icon={<LeftOutlined />}
              onClick={onPrevWeek}
              disabled={isNavigationDisabled}
            />
          </Tooltip>
          <Tooltip title="Next week">
            <Button
              icon={<RightOutlined />}
              onClick={onNextWeek}
              disabled={isNavigationDisabled}
            />
          </Tooltip>
        </Space>
      }
    >
      <Table
        className="create-schedule-table"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        bordered
        size="middle"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="No timetable data" /> }}
      />
    </Card>
  );
};

export default CalendarTable;

