import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// แนบ Token กับทุกคำขอ
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API ยืนยันตัวตน
export const loginUser = (username, password) => api.post('/auth/login', { username, password });
export const registerUser = (username, email, password) => api.post('/auth/register', { username, email, password });
export const getCurrentUser = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

// API แพ็กเก็ต
export const getPackets = (params = {}) => api.get('/packets', { params });
export const getPacketById = (id) => api.get(`/packets/${id}`);
export const encryptPayload = (payload) => api.post('/packets/encrypt', { payload });
export const decryptPayload = (encryptedPayload) => api.post('/packets/decrypt', { encryptedPayload });
export const startCapture = (interval) => api.post(`/packets/capture/start?interval=${interval}`);
export const stopCapture = () => api.post('/packets/capture/stop');
export const getCaptureStatus = () => api.get('/packets/capture/status');

// API สถิติ
export const getOverviewStats = () => api.get('/stats/overview');
export const getProtocolStats = () => api.get('/stats/protocols');
export const getTimeline = (minutes = 30) => api.get(`/stats/timeline?minutes=${minutes}`);
export const getThreatStats = () => api.get('/stats/threats');
export const getTopIPs = () => api.get('/stats/top-ips');

// API แอดมิน
export const getAdminUsers = () => api.get('/admin/users');
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });
export const getAuditLogs = (page = 1) => api.get(`/admin/logs?page=${page}`);

export default api;
