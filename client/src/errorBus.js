// Lets code outside React (the query client) report errors to the toast stack.
const listeners = new Set();

export function onReportedError(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function reportError(message) {
  for (const fn of listeners) fn(message);
}
