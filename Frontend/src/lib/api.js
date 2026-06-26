import { getToken } from '../services/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5187/api';

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
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

export const getDocumentAnnotations = async (id) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/${id}/annotations`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch document annotations');
  }
  return await response.json();
};

export const saveDocumentAnnotations = async (id, annotationsJson) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/${id}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ annotationsJson })
  });
  if (!response.ok) {
    throw new Error('Failed to save annotations');
  }
  return await response.json();
};

export const translateSentence = async (text) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/vocabulary/translate-sentence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    throw new Error('Failed to translate sentence');
  }
  return await response.json();
};

export const compareSentences = async (originalText, modifiedText) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/vocabulary/interactive-compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ originalText, modifiedText })
  });
  if (!response.ok) {
    throw new Error('Failed to compare sentences');
  }
  return await response.json();
};

export const getAllHighlights = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/all-highlights`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch highlights');
  }
  return await response.json();
};

export const askAiAssistant = async (word, question, contextSentence) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/vocabulary/ai-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ word, question, contextSentence })
  });
  if (!response.ok) {
    throw new Error('Failed to fetch AI assistant reply');
  }
  return await response.json();
};

export const exportDocx = async (id, title) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/${id}/export-docx`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to export document to Word');
  }
  
  const contentDisposition = response.headers.get('content-disposition');
  let filename = '';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;\n]+)/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
    }
  }
  
  if (!filename) {
    const cleanTitle = (title || 'Hanora_Document').replace(/[\\/:*?"<>|]/g, '_');
    filename = `${cleanTitle}.docx`;
  }
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  window.document.body.appendChild(link);
  link.click();
  
  // Delay revoking the Object URL to let the browser download it with the metadata intact
  setTimeout(() => {
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 250);
};
