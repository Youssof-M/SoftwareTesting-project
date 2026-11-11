const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('stableflowToken');
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new Event('stableflow:unauthorized'));
    throw new Error(body.message || 'Request failed');
  }
  return body;
}

export const listRecords = (kind) => request(`/${kind}`);
export const createRecord = (kind, value) => request(`/${kind}`, {
  method: 'POST', body: JSON.stringify(value),
});
export const deleteRecord = (kind, id) => request(`/${kind}/${id}`, { method: 'DELETE' });
export const completeActivity = (id) => request(`/activities/${id}/complete`, { method: 'POST' });
export const completeRoutine = (id, date) => request(`/routines/${id}/complete`, { method: 'POST', body: JSON.stringify({ date }) });
export const login = (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const setupManager = (account) => request('/auth/setup', { method: 'POST', body: JSON.stringify(account) });
export const createStaffAccount = (account) => request('/auth/users', { method: 'POST', body: JSON.stringify(account) });
export const getStaffDailySchedule = (staffId, date) => request(`/staff/${staffId}/schedule?date=${encodeURIComponent(date)}`);
