import { getToken } from '../services/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5187/api';

export const uploadDocument = async (file) => {
  const token = getToken();

  // 1. Get Presigned URL
  const presignedResponse = await fetch(`${API_BASE_URL}/documents/presigned-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream'
    })
  });

  if (!presignedResponse.ok) {
    throw new Error('Failed to get presigned URL');
  }

  const { presignedUrl, fileUrl } = await presignedResponse.json();

  // 2. Upload file directly to S3
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to S3');
  }

  // 3. Register document in the backend
  const registerResponse = await fetch(`${API_BASE_URL}/documents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      fileUrl: fileUrl,
      originalFilename: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSizeBytes: file.size
    })
  });

  if (!registerResponse.ok) {
    throw new Error('Failed to register document');
  }

  return await registerResponse.json();
};

export const getDocument = async (id) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
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
  const response = await fetch(`${API_BASE_URL}/documents/my-documents`, {
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
  const response = await fetch(`${API_BASE_URL}/vocabulary/${encodeURIComponent(word)}`, {
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
  const response = await fetch(`${API_BASE_URL}/vocabulary/${encodeURIComponent(word)}/save`, {
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
