import { apiRequest } from './apiClient';

export const adminApi = {
  overview: () => apiRequest('/admin/overview', { auth: true }),

  revenue: () => apiRequest('/admin/revenue', { auth: true }),

  searchStats: () => apiRequest('/admin/search-stats', { auth: true }),

  translationApprovals: (params = {}) => apiRequest(`/admin/translation-approvals${toQuery(params)}`, { auth: true }),

  updateTranslationApproval: (id, payload) => apiRequest(`/admin/translation-approvals/${id}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  }),

  users: (params = {}) => apiRequest(`/admin/users${toQuery(params)}`, { auth: true }),

  updateUser: (id, payload) => apiRequest(`/admin/users/${id}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  }),

  documents: (params = {}) => apiRequest(`/admin/documents${toQuery(params)}`, { auth: true }),

  deleteDocument: (id) => apiRequest(`/admin/documents/${id}`, {
    method: 'DELETE',
    auth: true,
  }),

  vocabulary: (params = {}) => apiRequest(`/admin/vocabulary${toQuery(params)}`, { auth: true }),

  createVocabulary: (payload) => apiRequest('/admin/vocabulary', {
    method: 'POST',
    body: payload,
    auth: true,
  }),

  updateVocabulary: (id, payload) => apiRequest(`/admin/vocabulary/${id}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  }),

  deleteVocabulary: (id) => apiRequest(`/admin/vocabulary/${id}`, {
    method: 'DELETE',
    auth: true,
  }),

  reports: (params = {}) => apiRequest(`/admin/reports${toQuery(params)}`, { auth: true }),

  updateReport: (id, status) => apiRequest(`/admin/reports/${id}`, {
    method: 'PATCH',
    body: { status },
    auth: true,
  }),
};

function toQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}
