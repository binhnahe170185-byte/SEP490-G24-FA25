
import axios from "axios";

function resolveBaseUrl() {
  const fromEnv = process.env.REACT_APP_API_BASE;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }

  if (typeof window !== "undefined") {
    const { origin } = window.location;

    if (origin.includes("localhost")) {
      return "http://localhost:5000";
    }

    // Deployed on web: default to Azure App Service API base
    return "https://fjap.azurewebsites.net";
  }

  return undefined;
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// Ensure Authorization header always attached from localStorage if present
api.interceptors.request.use((config) => {
  try {
    if (!config.headers || !config.headers["Authorization"]) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

// Global 401 handler: token expired/invalid -> clear session (no auto redirect)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("profile");
        // Clear auth token from axios defaults
        delete api.defaults.headers.common["Authorization"];
      } catch {}
      // Don't auto redirect - let components handle 401 errors
    }
    return Promise.reject(error);
  }
);