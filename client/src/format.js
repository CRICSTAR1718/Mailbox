const pad = (n) => String(n).padStart(2, '0');

// time if today, "Sep 28" this year, dd/mm/yy otherwise
export function formatDate(iso, now = new Date()) {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}

export const formatFull = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
