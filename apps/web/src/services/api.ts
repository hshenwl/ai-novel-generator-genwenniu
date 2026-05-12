import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

const eventBus = {
  listeners: new Map<string, Set<(...args: any[]) => void>>(),
  on(event: string, cb: (...args: any[]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  },
  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  },
};

export { eventBus };

api.interceptors.response.use(
  (response) => {
    if (response.config.responseType === 'blob') return response;
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      eventBus.emit('auth:unauthorized');
    }
    return Promise.reject(error);
  }
)

/**
 * 统一列表响应标准化
 * 处理后端两种可能的返回格式：直接数组 或 { items: [] }
 */
export function extractList<T>(response: any): T[] {
  if (Array.isArray(response)) return response
  if (response?.items && Array.isArray(response.items)) return response.items
  return []
}

export function extractErrorMessage(error: any, fallback: string = '操作失败'): string {
  return error?.response?.data?.message || error?.message || fallback
}

export default api