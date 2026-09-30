import { Archive, Inbox, OctagonAlert, Trash2 } from 'lucide-react';

export function ToolButton({ label, onClick, disabled, children, className = '' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
    >
      {children}
    </button>
  );
}

export const MOVE_TARGETS = [
  { folder: 'inbox', label: 'Inbox', icon: Inbox },
  { folder: 'spam', label: 'Spam', icon: OctagonAlert },
  { folder: 'trash', label: 'Trash', icon: Trash2 },
  { folder: 'archive', label: 'Archive', icon: Archive },
];
