import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const LOGO_WORDMARK_WHITE = "https://customer-assets.emergentagent.com/job_57c58aff-95fd-4ac6-9825-cd858c9017c6/artifacts/ketnvau4_reellab-wordmark-transparent-white-text-1200w.png";
export const LOGO_WORDMARK_DARK = "https://customer-assets.emergentagent.com/job_57c58aff-95fd-4ac6-9825-cd858c9017c6/artifacts/ehdwbg0a_reellab-wordmark-dark-600w.png";
export const LOGO_ICON = "https://customer-assets.emergentagent.com/job_57c58aff-95fd-4ac6-9825-cd858c9017c6/artifacts/tdzikdiz_reellab-icon-gradient-512.png";

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("rl_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.includes("/login") && !path.includes("/register") && path !== "/") {
        localStorage.removeItem("rl_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatErr(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (typeof detail === "object" && detail.message) return detail.message;
  return String(detail);
}

export default api;
