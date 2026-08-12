import { getToken } from '../services/apiClient';
import { validateUploadFile } from '../utils/uploadRules';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const isLocalApiBaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(configuredApiBaseUrl || '');

const API_BASE_URL = configuredApiBaseUrl && (import.meta.env.DEV || !isLocalApiBaseUrl)
  ? configuredApiBaseUrl
  : (import.meta.env.DEV ? 'http://localhost:5187/api' : '/api');

// Documents stored by the local-development fallback use paths such as
// "/uploads/Hanora/...". Resolve those against the API server rather than the
// Vite server, which otherwise responds with index.html instead of the asset.
export const resolveDocumentAssetUrl = (url) => {
  if (!url || /^(?:https?:|blob:|data:)/i.test(url)) return url;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/i, '');
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};

async function readApiError(response, fallback) {
  const errorData = await response.json().catch(() => ({}));
  return errorData.error || errorData.message || fallback;
}

function uploadToPresignedUrl(presignedUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', presignedUrl);
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    request.send(file);
  });
}

export const uploadDocument = async (file, options = {}) => {
  const validationError = validateUploadFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const token = getToken();

  console.log('[api] uploadDocument: starting direct upload to', `${API_BASE_URL}/documents/upload`);

  const formData = new FormData();
  formData.append('file', file);

  options.onProgress?.(30);

  let directResponse;
  try {
    directResponse = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
  } catch (networkErr) {
    console.error('[api] uploadDocument: network error (fetch failed):', networkErr);
    throw new Error(`Không thể kết nối tới máy chủ: ${networkErr.message}`);
  }

  console.log('[api] uploadDocument: response status', directResponse.status);

  if (directResponse.ok) {
    options.onProgress?.(100);
    return await directResponse.json();
  }

  // Direct upload failed — read error and throw
  const errMsg = await readApiError(directResponse, 'Đã xảy ra lỗi không xác định khi xử lý tài liệu.');
  throw new Error(errMsg);
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


export const generateDocumentOcrPage = async (id, pageNumber) => {
  const token = getToken();
  const response = await fetch(API_BASE_URL + '/documents/' + id + '/ocr-page/' + pageNumber, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate OCR page');
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

export const deleteVocabularyFromNotebook = async (id, options = {}) => {
  const token = getToken();
  const response = await fetch(API_BASE_URL + '/vocabulary/' + id, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    body: JSON.stringify({ deleteFlashcards: Boolean(options.deleteFlashcards) })
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, 'Không thể xóa từ vựng.'));
  }
  return await response.json();
};

export const deleteVocabulariesFromNotebook = async (ids, options = {}) => {
  const token = getToken();
  const response = await fetch(API_BASE_URL + '/vocabulary', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    body: JSON.stringify({ ids, deleteFlashcards: Boolean(options.deleteFlashcards) })
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, 'Không thể xóa từ vựng đã chọn.'));
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

export const reportTranslationError = async (word, currentTranslation, proposedTranslation, notes) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/vocabulary/report-translation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ word, currentTranslation, proposedTranslation, notes })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to submit translation feedback');
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
