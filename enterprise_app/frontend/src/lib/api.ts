/**
 * Dynamic API URL resolver.
 * 
 * In the browser, returns relative paths (e.g. /api/v1/...) so that Next.js
 * rewrites them to the backend server automatically.
 * This guarantees it works on localhost, LAN IP, or HTTPS tunnels without
 * port conflicts, mixed-content errors, or CORS issues.
 */
export const getApiUrl = (endpoint: string = ""): string => {
  let clean = (endpoint || "").trim();
  if (!clean) return typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");

  if (!clean.startsWith("/")) {
    clean = `/${clean}`;
  }

  // Normalize /v1/... to /api/v1/... if /api prefix is missing
  if (!clean.startsWith("/api")) {
    clean = `/api${clean}`;
  }

  if (typeof window !== "undefined") {
    return clean;
  }

  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  return `${base.replace(/\/$/, "")}${clean}`;
};

export const API_BASE_URL = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000");
