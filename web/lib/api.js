const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const CUR = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₹';
export const money = (n) => `${CUR}${Number(n || 0).toFixed(2)}`;
const KEY = 'restoflow_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(KEY)),
  set: (t) => window.localStorage.setItem(KEY, t),
  clear: () => window.localStorage.removeItem(KEY),
};

export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

export const ROLE_LABELS = {
  admin: 'Admin',
  shift_manager: 'Shift Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen / Chef',
  staff: 'Waitstaff',
};

export const ROLE_ICONS = {
  admin: '👑',
  shift_manager: '👔',
  cashier: '🧾',
  kitchen: '🍳',
  staff: '🍽️',
};

export async function download(path, filename) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const e = data.error || {};
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Download failed', e.details);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    if (res.status === 401 && token && typeof window !== 'undefined') {
      tokenStore.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Request failed', e.details);
  }
  return data;
}

export const errMsg = (e) => {
  if (e?.details?.length && e.code === 'VALIDATION_ERROR') return e.details.map((d) => `${d.path ? d.path + ': ' : ''}${d.message}`).join('; ');
  if (e?.code === 'ITEM_UNAVAILABLE' && e.details?.length) return `Unavailable: ${e.details.map((d) => d.name || d.menuItemId).join(', ')}`;
  return e?.message || 'Something went wrong';
};

export const uuid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const newKey = uuid;
export const timeAgo = (d) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`;
};
