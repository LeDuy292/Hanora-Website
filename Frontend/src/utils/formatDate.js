/**
 * Formats an ISO date string or Date object into a readable date string.
 * E.g., "Jun 3, 2026" or "Today" or "Yesterday"
 * 
 * @param {string|Date} dateVal - Date value to format
 * @returns {string}
 */
export function formatDate(dateVal) {
  if (!dateVal) return "";
  
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1 && d.getDate() === now.getDate()) {
    return "Today";
  } else if (diffDays <= 2 && d.getDate() === new Date(now - 86400000).getDate()) {
    return "Yesterday";
  }
  
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
