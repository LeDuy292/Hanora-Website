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

export const deleteDocument = async (id) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete document');
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

export const getChatSessions = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch chat sessions');
  }
  return await response.json();
};

export const getChatMessages = async (sessionId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch chat messages');
  }
  return await response.json();
};

export const createChatSession = async (title) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error('Failed to create chat session');
  }
  return await response.json();
};

export const sendChatMessage = async (sessionId, content, activeDocContext) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ content, activeDocContext })
  });
  if (!response.ok) {
    throw new Error('Failed to send chat message');
  }
  return await response.json();
};

export const renameChatSession = async (sessionId, title) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/title`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error('Failed to rename chat session');
  }
  return response;
};

export const togglePinChatSession = async (sessionId, isPinned) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/pin`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ isPinned })
  });
  if (!response.ok) {
    throw new Error('Failed to toggle pin state');
  }
  return response;
};

export const deleteChatSession = async (sessionId) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to delete chat session');
  }
  return response;
};

export const getCommunityMessages = async () => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/community/messages`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch community messages');
  }
  return await response.json();
};

