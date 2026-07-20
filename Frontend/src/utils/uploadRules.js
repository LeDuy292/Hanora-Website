export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

export const UPLOAD_RULE_TEXT = 'PDF, DOCX, JPG, JPEG hoặc PNG, tối đa 5 MB';

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '0 KB';
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;
}

export function getFileExtension(fileName = '') {
  const index = fileName.lastIndexOf('.');
  return index >= 0 ? fileName.slice(index).toLowerCase() : '';
}

export function validateUploadFile(file) {
  if (!file) return 'Vui lòng chọn một tệp tài liệu.';

  const extension = getFileExtension(file.name);
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    return `Định dạng tệp không được hỗ trợ. Hanora chỉ hỗ trợ ${UPLOAD_RULE_TEXT}.`;
  }

  if (file.type && !ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return `MIME Type của tệp không hợp lệ. Hanora chỉ hỗ trợ ${UPLOAD_RULE_TEXT}.`;
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `Tệp bạn chọn có dung lượng ${formatFileSize(file.size)}. Hanora chỉ hỗ trợ ${UPLOAD_RULE_TEXT}.`;
  }

  if (file.size <= 0) {
    return 'Tệp tải lên không hợp lệ hoặc đang rỗng.';
  }

  return '';
}
