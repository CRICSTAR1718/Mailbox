import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useCompose } from './ComposeContext.jsx';
import Modal, { DialogButton } from '../components/ui/Modal.jsx';

const ShortcutsContext = createContext(null);

// key -> shortcut name. Handlers for the list/thread are registered by the current view.
const KEYS = {
  c: 'compose', '/': 'search', '?': 'help',
  j: 'next', k: 'prev', o: 'open', Enter: 'open', x: 'select',
  e: 'archive', '#': 'trash', s: 'star', u: 'back',
  I: 'read', U: 'unread', // shift+i / shift+u
};

export const SHORTCUT_HELP = [
  ['c', 'Compose'],
  ['/', 'Search mail'],
  ['j / k', 'Next / previous conversation'],
  ['o or Enter', 'Open conversation'],
  ['x', 'Select conversation'],
  ['e', 'Archive'],
  ['#', 'Delete'],
  ['s', 'Star / unstar'],
  ['u', 'Back to list'],
  ['Shift + i', 'Mark as read'],
  ['Shift + u', 'Mark as unread'],
  ['?', 'Show this help'],
];

export function ShortcutsProvider({ children }) {
  const { openCompose } = useCompose();
  const stack = useRef([]); // refs to the handler objects of mounted views (latest wins)
  const [helpOpen, setHelpOpen] = useState(false);

  const register = useCallback((ref) => {
    stack.current.push(ref);
    return () => {
      stack.current = stack.current.filter((r) => r !== ref);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const name = KEYS[e.key];
      if (!name) return;
      const t = e.target;
      // never hijack typing, dialogs (compose windows, modals) or open menus
      if (t.closest?.('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
      // Enter on a focused row/button already does its own thing
      if (e.key === 'Enter' && t.closest?.('a, button, [role="link"], [role="menuitem"], [role="checkbox"]')) return;

      if (name === 'compose') openCompose();
      else if (name === 'search') document.querySelector('input[aria-label="Search mail"]')?.focus();
      else if (name === 'help') setHelpOpen(true);
      else {
        const handler = [...stack.current].reverse().map((ref) => ref.current?.[name]).find(Boolean);
        if (!handler) return;
        handler();
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCompose]);

  return (
    <ShortcutsContext.Provider value={{ register }}>
      {children}
      {helpOpen && (
        <Modal title="Keyboard shortcuts" onClose={() => setHelpOpen(false)} width="w-[440px]">
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {SHORTCUT_HELP.map(([keys, what]) => (
              <div key={keys} className="contents">
                <dt><kbd className="rounded border border-edge bg-tint px-2 py-0.5 font-mono text-xs">{keys}</kbd></dt>
                <dd className="m-0 text-ink">{what}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex justify-end"><DialogButton primary onClick={() => setHelpOpen(false)}>Close</DialogButton></div>
        </Modal>
      )}
    </ShortcutsContext.Provider>
  );
}

// Register handlers ({ next, prev, open, select, archive, trash, star, back, read, unread }) while mounted.
export function useShortcuts(handlers) {
  const ctx = useContext(ShortcutsContext);
  const ref = useRef(handlers);
  ref.current = handlers;
  const register = ctx?.register;
  useEffect(() => (register ? register(ref) : undefined), [register]);
}
