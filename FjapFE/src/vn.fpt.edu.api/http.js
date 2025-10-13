
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

    return origin;
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
