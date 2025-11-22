import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL } from '../../vn.fpt.edu.api/http';
import { fetchRecentNotifications } from '../../vn.fpt.edu.api/Notification';

const NOTIFICATION_LIMIT = 20;
const DEFAULT_STORAGE_KEY = 'notifications:read';

export function useRealtimeNotifications(take = NOTIFICATION_LIMIT) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const storageKeyRef = useRef(getStorageKey());
  const readMapRef = useRef(loadReadMap(storageKeyRef.current));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const items = await fetchRecentNotifications({ take });
        if (!cancelled) {
          setNotifications(
            items
              .map((item) => normalizeNotification(item, readMapRef.current))
              .slice(0, take)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [take]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionState('disconnected');
      return undefined;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/hubs/notifications`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build();

    const handleNotification = (raw) => {
      setNotifications((prev) => {
        const next = [normalizeNotification(raw, readMapRef.current), ...prev];
        const deduped = [];
        const seen = new Set();

        for (const item of next) {
          if (!seen.has(item.id)) {
            deduped.push(item);
            seen.add(item.id);
          }
        }

        return deduped.slice(0, take);
      });
    };

    connection.on('ReceiveNotification', handleNotification);
    connection.on('ReceiveNotifications', (items) => {
      items?.forEach(handleNotification);
    });

    connection.onreconnecting(() => setConnectionState('reconnecting'));
    connection.onreconnected(() => setConnectionState('connected'));
    connection.onclose(() => setConnectionState('disconnected'));

    connection
      .start()
      .then(() => setConnectionState('connected'))
      .catch((err) => {
        setConnectionState('failed');
        setError(err);
      });

    return () => {
      connection.off('ReceiveNotification', handleNotification);
      connection.off('ReceiveNotifications');
      connection.stop();
    };
  }, [take]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    if (!readMapRef.current[id]) {
      readMapRef.current = { ...readMapRef.current, [id]: true };
      persistReadMap(storageKeyRef.current, readMapRef.current);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => (item.read ? item : { ...item, read: true }))
    );
    const updated = { ...readMapRef.current };
    notifications.forEach((item) => {
      updated[item.id] = true;
    });
    readMapRef.current = updated;
    persistReadMap(storageKeyRef.current, readMapRef.current);
  };

  return {
    notifications,
    loading,
    error,
    connectionState,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export function formatNotificationTime(value) {
  const date = dayjs(value);
  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  if (diffDays === 0) {
    const diffHours = now.diff(date, 'hour');
    if (diffHours >= 1) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    const diffMinutes = now.diff(date, 'minute');
    if (diffMinutes >= 1) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return date.format('DD/MM/YYYY');
}

export function getNotificationIcon(type) {
  switch (type) {
    case 'homework':
      return '📝';
    case 'grade':
      return '📊';
    case 'schedule':
      return '📅';
    case 'reminder':
      return '⏰';
    case 'attendance':
      return '✓';
    case 'news':
      return '📰';
    default:
      return '🔔';
  }
}

export function describeConnectionState(state) {
  switch (state) {
    case 'connected':
      return 'Realtime connected';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'failed':
      return 'Failed to connect to realtime service';
    default:
      return 'Realtime disconnected';
  }
}

function normalizeNotification(raw, readMap) {
  const createdTime = raw?.createdTime ? new Date(raw.createdTime) : new Date();
  const type = deriveType(raw?.category, raw?.title, raw?.content);
  const id = raw?.id ?? generateFallbackId();

  // Parse EntityId từ Content (JSON metadata ở cuối)
  let content = raw?.content ?? '';
  let entityId = null;
  let link = null;

  // Tìm JSON metadata ở cuối content
  // Format: \n\n{"entityId":123} hoặc {"entityId":123} ở cuối (khi content rỗng)
  const jsonMatch = content.match(/(?:^|\n\n)\{"entityId":(\d+)\}$/);
  if (jsonMatch) {
    entityId = parseInt(jsonMatch[1], 10);
    // Loại bỏ metadata khỏi content để hiển thị
    content = content.replace(/(?:^|\n\n)\{"entityId":\d+\}$/, '').trim();
  }

  // Tạo link động dựa trên category và entityId
  // Một số type không cần entityId (grade, homework)
  link = generateNotificationLink(type, entityId);

  return {
    id,
    title: raw?.title ?? '',
    content,
    createdTime,
    read: Boolean(raw?.read) || Boolean(readMap?.[id]),
    type,
    link,
    entityId,
  };
}

function generateNotificationLink(type, entityId) {
  const normalizedType = type?.toLowerCase();
  
  switch (normalizedType) {
    case 'news':
      return entityId ? `/student/news/${entityId}` : null;
    case 'homework':
      return `/student/homework`;
    case 'grade':
      // Grade không cần entityId, link luôn là /student/grades
      return `/student/grades`;
    default:
      return null;
  }
}

function deriveType(category, title, content) {
  // Ưu tiên sử dụng category từ backend
  const normalizedCategory = category?.toLowerCase();
  if (normalizedCategory) {
    return normalizedCategory;
  }

  // Fallback: parse từ title và content
  const text = `${title ?? ''} ${content ?? ''}`.toLowerCase();
  if (text.includes('grade') || text.includes('score') || text.includes('điểm')) return 'grade';
  if (
    text.includes('assignment') ||
    text.includes('homework') ||
    text.includes('task') ||
    text.includes('bài tập')
  )
    return 'homework';
  if (text.includes('schedule') || text.includes('timetable') || text.includes('lịch')) return 'schedule';
  if (text.includes('news') || text.includes('announcement') || text.includes('tin')) return 'news';
  if (text.includes('attendance') || text.includes('presence') || text.includes('điểm danh')) return 'attendance';
  if (text.includes('remind') || text.includes('reminder') || text.includes('nhắc')) return 'reminder';
  return 'general';
}

function generateFallbackId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `notif-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStorageKey() {
  try {
    const profileRaw = localStorage.getItem('profile');
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      const accountId =
        profile?.accountId ??
        profile?.account_id ??
        profile?.userId ??
        profile?.user_id ??
        profile?.user?.userId ??
        profile?.user?.accountId ?? null;
      if (accountId) {
        return `${DEFAULT_STORAGE_KEY}:${accountId}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_STORAGE_KEY;
}

function loadReadMap(key) {
  try {
    const content = localStorage.getItem(key);
    if (!content) return {};
    const parsed = JSON.parse(content);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function persistReadMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore storage errors (quota, etc.)
  }
}


