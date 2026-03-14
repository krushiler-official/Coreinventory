import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ci_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ci_token');
      localStorage.removeItem('ci_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Typed helpers ──────────────────────────────────────────────────────────
export const authApi = {
  login:         (data: any) => api.post('/auth/login', data),
  signup:        (data: any) => api.post('/auth/signup', data),
  forgotPw:      (data: any) => api.post('/auth/forgot-password', data),
  resetPw:       (data: any) => api.post('/auth/reset-password', data),
  me:            ()          => api.get('/auth/me'),
  updateProfile: (data: any) => api.patch('/auth/profile', data),
};

export const productApi = {
  list:       (params?: any)       => api.get('/products', { params }),
  get:        (id: string)         => api.get(`/products/${id}`),
  create:     (data: any)          => api.post('/products', data),
  update:     (id: string, d: any) => api.patch(`/products/${id}`, d),
  delete:     (id: string)         => api.delete(`/products/${id}`),
  categories: ()                   => api.get('/products/categories'),
};

export const warehouseApi = {
  list:            (params?: any) => api.get('/warehouses', { params }),
  create:          (data: any)    => api.post('/warehouses', data),
  update:          (id: string, d: any) => api.patch(`/warehouses/${id}`, d),
  listLocations:   (params?: any) => api.get('/warehouses/locations', { params }),
  createLocation:  (data: any)    => api.post('/warehouses/locations', data),
};

export const operationApi = {
  list:            (params?: any)          => api.get('/operations', { params }),
  get:             (id: string)            => api.get(`/operations/${id}`),
  createReceipt:   (data: any)             => api.post('/operations/receipts', data),
  createDelivery:  (data: any)             => api.post('/operations/deliveries', data),
  createTransfer:  (data: any)             => api.post('/operations/transfers', data),
  createAdjustment:(data: any)             => api.post('/operations/adjustments', data),
  validate:        (id: string)            => api.patch(`/operations/${id}/validate`),
  cancel:          (id: string)            => api.patch(`/operations/${id}/cancel`),
};

export const stockApi = {
  byLocation: (params?: any) => api.get('/stock', { params }),
  moves:      (params?: any) => api.get('/stock/moves', { params }),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};
