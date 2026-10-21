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
  if (!clean.startsWith("/")) {
    clean = `/${clean}`;
  }

  // Normalize /v1/... to /api/v1/... if /api prefix is missing
  if (!clean.startsWith("/api")) {
    clean = `/api${clean}`;
  }

  // If NEXT_PUBLIC_API_URL is configured (e.g. https://apni-kaksha-api.onrender.com),
  // return absolute URL so the browser calls the backend directly without proxy timeouts
  const base = (process.env.NEXT_PUBLIC_API_URL || "").trim();
  if (base && base.startsWith("http")) {
    return `${base.replace(/\/$/, "")}${clean}`;
  }

  // Fallback to relative path for local development / rewrites
  return clean;
};

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
