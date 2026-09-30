import { useEffect, useRef, useState } from 'react';

// Small popover menu. `trigger` receives { open, toggle }; `children` is a function receiving { close }.
export default function Menu({ trigger, children, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-30 mt-1 min-w-[168px] rounded bg-popover py-2 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15),0_1px_2px_rgba(60,64,67,0.3)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, icon: Icon, disabled }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-left text-sm whitespace-nowrap text-ink hover:bg-hover disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
    >
      {Icon && <Icon size={16} className="shrink-0 text-icon" />}
      {children}
    </button>
  );
}
