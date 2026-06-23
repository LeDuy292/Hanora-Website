import { getToken } from '../services/apiClient';

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload document');
  }

  return await response.json();
};

export const getDocument = async (id) => {
  const token = getToken();
  const response = await fetch(`/api/documents/${id}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return await response.json();
};

export const getMyDocuments = async () => {
  const token = getToken();
  const response = await fetch('/api/documents/my-documents', {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return await response.json();
};

export const getVocabulary = async (word) => {
  const token = getToken();
  const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch vocabulary');
  }
  return await response.json();
};

export const saveToNotebook = async (word, documentId) => {
  const token = getToken();
  const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ documentId })
  });
  if (!response.ok) {
    throw new Error('Failed to save to notebook');
  }
  return await response.json();
};
