export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload document');
  }

  return await response.json();
};

export const getDocument = async (id) => {
  const response = await fetch(`/api/documents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return await response.json();
};

export const getMyDocuments = async () => {
  const response = await fetch('/api/documents/my-documents');
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return await response.json();
};

export const getVocabulary = async (word) => {
  const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch vocabulary');
  }
  return await response.json();
};

export const saveToNotebook = async (word, documentId) => {
  const response = await fetch(`/api/vocabulary/${encodeURIComponent(word)}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentId })
  });
  if (!response.ok) {
    throw new Error('Failed to save to notebook');
  }
  return await response.json();
};
