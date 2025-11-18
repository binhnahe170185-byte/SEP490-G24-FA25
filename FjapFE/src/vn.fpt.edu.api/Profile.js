// src/api/Profile.js
import { api } from "./http";

// Chuẩn hoá response { code, data }
function unwrap(res) {
  const raw = res?.data || {};
  return raw.data ?? raw;
}

const ProfileApi = {
  // GET /api/profile
  getProfile: () => api.get("/api/profile").then(unwrap),

  // PUT /api/profile
  updateProfile: (payload) => api.put("/api/profile", payload).then(unwrap),
};

export default ProfileApi;

