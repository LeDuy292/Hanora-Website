/**
 * Thin fetch wrapper around the Hanora backend API.
 * Automatically attaches the JWT bearer token and parses JSON / error envelopes.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5187/api';

const TOKEN_KEY = 'hanora-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Performs an API request. Throws an Error with a friendly `.message`
 * (using the backend's `{ error }` envelope when present) on non-2xx.
 */
export async function apiRequest(path, { method = 'GET', body, auth = false, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.');
  }

  // 204 No Content
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' && data) ||
      'Đã có lỗi xảy ra. Vui lòng thử lại.';
    throw new Error(message);
  }

  return data;
}
