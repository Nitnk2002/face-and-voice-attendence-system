/**
 * Dynamic API URL resolver.
 * 
 * In the browser, returns relative paths (e.g. /api/v1/...) so that Next.js
 * rewrites them to the backend server automatically when NEXT_PUBLIC_API_URL is omitted.
 * When NEXT_PUBLIC_API_URL is configured (e.g. https://apni-kaksha-api.onrender.com),
 * returns absolute URLs directly so the browser communicates with Render directly.
 */
export const getApiUrl = (endpoint: string = ""): string => {
  let clean = (endpoint || "").trim();
  if (!clean.startsWith("/")) {
    clean = `/${clean}`;
  }

  // Normalize /v1/... to /api/v1/... if /api prefix is missing
  if (clean.startsWith("/v1")) {
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

export interface BackendHealthStatus {
  online: boolean;
  url: string;
  latencyMs?: number;
  error?: string;
}

/**
 * Probes the backend server to detect whether Render is running, sleeping, or down.
 */
export const checkBackendHealth = async (): Promise<BackendHealthStatus> => {
  const url = getApiUrl("/health");
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return { online: true, url, latencyMs: Date.now() - start };
    }
    return { online: false, url, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { online: false, url, error: err.name === "AbortError" ? "Timed out after 12s" : err.message || "Unreachable" };
  }
};

/**
 * Formats low-level browser network errors into clear, actionable diagnosis for users.
 */
export const formatFetchError = (err: any, endpoint: string = ""): string => {
  const target = getApiUrl(endpoint);
  const msg = err?.message || "";
  const isNetworkFailure =
    err?.name === "TypeError" ||
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("load failed");

  if (isNetworkFailure) {
    return `Cannot connect to backend (${target}). Render free-tier instances sleep when idle and take ~45 seconds to spin up. Please ensure your Render backend service is live and NEXT_PUBLIC_API_URL in Vercel is set to your Render HTTPS URL.`;
  }
  return msg || "An unexpected error occurred.";
};
