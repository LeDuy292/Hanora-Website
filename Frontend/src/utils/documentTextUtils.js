export const LINE_BREAK = '\n';
export const PARAGRAPH_BREAK = '\n\n';

export const isStructureMarker = (segment) =>
  segment === LINE_BREAK || segment === PARAGRAPH_BREAK;

export const joinDocumentSegments = (segments) =>
  (segments || []).join('');

export const splitDocumentParagraphs = (text) =>
  (text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
