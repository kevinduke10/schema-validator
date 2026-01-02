import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Schemas API
export const schemasApi = {
  getAll: () => api.get('/schemas'),
  getById: (id) => api.get(`/schemas/${id}`),
  getBySchemaId: (schemaId) => api.get(`/schemas/${schemaId}`),
  create: (schemaData) => api.post('/schemas', schemaData),
  update: (schemaId, updates) => api.put(`/schemas/${schemaId}`, updates),
  setActiveVersion: (schemaId, version) => api.put(`/schemas/${schemaId}/active`, { version }),
  toggleEnabled: (id, enabled) => api.put(`/schemas/${id}/enabled`, { enabled }),
  delete: (id) => api.delete(`/schemas/${id}`),
  deleteAll: () => api.delete('/schemas'),
  validate: (schemaId, data) => api.post(`/schemas/${schemaId}/validate`, { data }),
};

// Configurations API
export const configurationsApi = {
  getAll: () => api.get('/configurations'),
  getById: (id) => api.get(`/configurations/${id}`),
  getBySchemaId: (schemaId) => api.get(`/configurations?schemaId=${schemaId}`),
  create: (configData) => api.post('/configurations', configData),
  update: (id, updates) => api.put(`/configurations/${id}`, updates),
  delete: (id) => api.delete(`/configurations/${id}`),
  deleteAll: () => api.delete('/configurations'),
};

export default api;

