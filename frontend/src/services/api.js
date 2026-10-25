import axios from "axios";

// VITE_API_URL is the API origin, e.g. https://jobverse-api.onrender.com.
// Without it, requests go to /api on the same origin.
const api = axios.create({
  baseURL: `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A stored session that the server rejects (expired after 7 days, or signed
// with an old secret) logs the user out instead of failing silently everywhere.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") window.location.assign("/login?expired=1");
    }
    return Promise.reject(error);
  },
);

// Prefer the server's explanation; fall back to a friendly default.
export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || (err?.request && !err?.response ? "Can't reach the server. Check your connection and try again." : fallback);

export default api;
