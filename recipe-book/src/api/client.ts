import type { TokenPair } from './types';

export const AUTH_URL = (import.meta.env.VITE_AUTH_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
export const RECIPES_URL = (import.meta.env.VITE_RECIPES_URL || 'http://127.0.0.1:5003').replace(/\/$/, '');

const REFRESH_KEY = 'rb.refresh';
const ACCESS_KEY = 'rb.access';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---- Token store ----
// The access token lives in memory (mirrored to sessionStorage so a reload in the
// same tab doesn't need a refresh). The refresh token is kept in localStorage.
let accessToken: string | null = safeGet(sessionStorage, ACCESS_KEY);
let onSessionExpired: (() => void) | null = null;

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: Storage, key: string, value: string | null) {
  try {
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const tokens = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return safeGet(localStorage, REFRESH_KEY);
  },
  set(pair: TokenPair) {
    accessToken = pair.access_token;
    safeSet(sessionStorage, ACCESS_KEY, pair.access_token);
    if (pair.refresh_token) safeSet(localStorage, REFRESH_KEY, pair.refresh_token);
  },
  clear() {
    accessToken = null;
    safeSet(sessionStorage, ACCESS_KEY, null);
    safeSet(localStorage, REFRESH_KEY, null);
  },
};

export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

// ---- Refresh (single-flight: refresh tokens are one-use, so concurrent 401s share one call) ----
let refreshing: Promise<boolean> | null = null;

export function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing;
  const rt = tokens.refresh;
  if (!rt) return Promise.resolve(false);
  refreshing = (async () => {
    try {
      const res = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${rt}` },
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      tokens.set((await res.json()) as TokenPair);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

// ---- Request ----
type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean; // default true
  token?: string; // explicit bearer token (e.g. refresh token for logout)
}

function buildUrl(base: string, path: string, query?: Query) {
  const url = new URL(base + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let code = 'http_error';
  let message = res.statusText || `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.error) code = data.error;
    if (data?.message) message = data.message;
    if (data?.errors && typeof data.errors === 'object') {
      message += ' ' + Object.entries(data.errors).map(([f, m]) => `${f}: ${m}`).join('; ');
    }
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, code, message);
}

export async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, token } = opts;

  const send = () => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const bearer = token ?? (auth ? tokens.access : null);
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    return fetch(buildUrl(base, path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, 'network_error', `Can't reach ${base}. Is the server running?`);
  }

  if (res.status === 401 && auth && !token) {
    if (await refreshTokens()) {
      res = await send();
    } else {
      tokens.clear();
      onSessionExpired?.();
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return null as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
