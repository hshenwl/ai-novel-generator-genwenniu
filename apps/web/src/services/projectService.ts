import api from './api'

export interface Project {
  id: string
  name: string
  genre?: string
  perspective?: string
  description?: string
  targetWords: number
  status: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectDto {
  name: string
  genre?: string
  perspective?: string
  description?: string
  targetWords?: number
}

export const projectService = {
  findAll: (params?: { page?: number; pageSize?: number; status?: string; genre?: string }) =>
    api.get('/projects', { params }),

  findOne: (id: string) =>
    api.get(`/projects/${id}`),

  create: (data: CreateProjectDto) =>
    api.post('/projects', data),

  update: (id: string, data: Partial<CreateProjectDto>) =>
    api.put(`/projects/${id}`, data),

  remove: (id: string) =>
    api.delete(`/projects/${id}`),

  getStats: (id: string) =>
    api.get(`/projects/${id}/stats`),
}