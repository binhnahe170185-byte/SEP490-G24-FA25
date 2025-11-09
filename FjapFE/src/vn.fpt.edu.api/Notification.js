import { api } from "./http";

export async function fetchRecentNotifications({ take = 20, since } = {}) {
  const params = { take };
  if (since) {
    params.since = since instanceof Date ? since.toISOString() : since;
  }
  const response = await api.get("/api/notifications/recent", { params });
  return response.data?.data ?? [];
}

export async function createNotification(payload) {
  const response = await api.post("/api/notifications", payload);
  return response.data?.data;
}


