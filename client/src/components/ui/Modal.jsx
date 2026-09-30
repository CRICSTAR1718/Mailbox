import { useEffect } from 'react';

// Centered dialog over a dim backdrop. Escape and a backdrop click close it.
export default function Modal({ title, onClose, children, width = 'w-[400px]' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`${width} max-w-full rounded-lg bg-popover p-6 shadow-[0_8px_10px_1px_rgba(0,0,0,0.14),0_3px_14px_2px_rgba(0,0,0,0.12),0_5px_5px_-3px_rgba(0,0,0,0.2)]`}>
        <h2 className="m-0 mb-4 text-[22px] font-normal text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function DialogButton({ children, onClick, primary, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-9 cursor-pointer rounded-full border-0 px-6 text-sm font-medium disabled:cursor-default disabled:opacity-50 ${
        primary ? 'bg-primary text-on-primary hover:bg-primary-hover' : 'bg-transparent text-link hover:bg-link-tint'
      }`}
    >
      {children}
    </button>
  );
}
