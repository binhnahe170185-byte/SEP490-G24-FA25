import React, { useMemo } from 'react';
import { Card, Typography, Badge, Empty, Spin, Tooltip } from 'antd';
import { BellOutlined, WifiOutlined } from '@ant-design/icons';
import {
  describeConnectionState,
  formatNotificationTime,
  getNotificationIcon,
  useRealtimeNotifications,
} from '../../../vn.fpt.edu.common/hooks/useRealtimeNotifications';

const { Title, Text } = Typography;

const NotificationsSection = () => {
  const {
    notifications,
    loading,
    error,
    connectionState,
    unreadCount,
    markAsRead,
  } = useRealtimeNotifications(20);

  const connectionTooltip = useMemo(() => {
    return describeConnectionState(connectionState);
  }, [connectionState]);

  return (
    <Card 
      className="section-card"
      title={
        <div className="section-card-header">
          <Badge count={unreadCount} className="notification-badge">
            <BellOutlined className="section-card-icon" />
          </Badge>
          <Title level={4} className="section-card-title">Notifications</Title>
          <Tooltip title={connectionTooltip}>
            <WifiOutlined
              style={{
                marginLeft: 'auto',
                color:
                  connectionState === 'connected'
                    ? '#52c41a'
                    : connectionState === 'reconnecting'
                    ? '#faad14'
                    : '#f5222d',
              }}
            />
          </Tooltip>
        </div>
      }
    >
      <div className="section-card-content">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : error ? (
          <Empty
            description="Unable to load notifications"
            style={{ margin: '20px 0' }}
          />
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="notification-item"
              onClick={() => {
                markAsRead(notification.id);
              }}
              style={{
                backgroundColor: !notification.read ? '#e6f7ff' : 'transparent',
                fontWeight: !notification.read ? 500 : 400,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16 }}>
                  {getNotificationIcon(notification.type)}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="notification-content">
                    {notification.title || notification.content}
                  </div>
                  {notification.content && notification.title && (
                    <Text type="secondary" style={{ display: 'block' }}>
                      {notification.content}
                    </Text>
                  )}
                  <Text className="notification-time">
                    {formatNotificationTime(notification.createdTime)}
                  </Text>
                </div>
              </div>
            </div>
          ))
        ) : (
          <Empty
            description="No new notifications"
            style={{ margin: '20px 0' }}
          />
        )}
      </div>
    </Card>
  );
};

export default NotificationsSection;
