/**
 * Sanjeevani Unified API Helper
 * Single source of truth for all API calls across Patient, Doctor, Reception, Pharmacy, and Lab portals.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export async function fetchJson<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  
  const headers = new Headers(options?.headers || {});
  if (!headers.has("Content-Type") && !(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `API Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) => 
    fetchJson<T>(endpoint, { ...options, method: "GET" }),
  
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    fetchJson<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) => 
    fetchJson<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) => 
    fetchJson<T>(endpoint, { ...options, method: "DELETE" }),
};
