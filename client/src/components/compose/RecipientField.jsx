import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../../api.js';

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Chip input with autocomplete from GET /api/users. Chips are { email, name }.
export default function RecipientField({ label, value, onChange, autoFocus, children }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const q = useDebounced(text.trim(), 150);
  const { data } = useQuery({
    queryKey: ['users', q],
    queryFn: () => api(`/users?${new URLSearchParams({ q, limit: 6 })}`),
    enabled: q.length > 0,
    staleTime: 30_000,
    meta: { silent: true },
  });
  const taken = new Set(value.map((c) => c.email));
  const suggestions = text.trim() ? (data?.users ?? []).filter((u) => !taken.has(u.email)) : [];
  const showList = focused && suggestions.length > 0;

  const add = (chips) => {
    const fresh = chips.filter((c, i) => !taken.has(c.email) && chips.findIndex((x) => x.email === c.email) === i);
    if (fresh.length) onChange([...value, ...fresh]);
  };
  const pick = (user) => {
    add([{ email: user.email, name: user.name }]);
    setText('');
    setActive(-1);
    inputRef.current?.focus();
  };
  // valid addresses become chips; anything else stays in the box (shown red)
  const commitText = (raw) => {
    const parts = raw.split(/[,;\s]+/).filter(Boolean);
    const good = parts.filter((p) => EMAIL_RE.test(p)).map((p) => ({ email: p.toLowerCase(), name: p.toLowerCase() }));
    const rest = parts.filter((p) => !EMAIL_RE.test(p));
    add(good);
    setText(rest.join(' '));
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && showList) {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && showList) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === 'Escape' && showList) {
      e.stopPropagation();
      setActive(-1);
      setFocused(false);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (showList && (active >= 0 || (e.key === 'Tab' && text.trim()))) {
        e.preventDefault();
        pick(suggestions[Math.max(active, 0)]);
      } else if (text.trim()) {
        e.preventDefault();
        commitText(text);
      }
    } else if ([',', ';', ' '].includes(e.key) && text.trim()) {
      e.preventDefault();
      commitText(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const invalid = text.trim() !== '' && !focused && !EMAIL_RE.test(text.trim());

  return (
    <div className="relative flex min-h-10 items-start border-b border-line text-sm">
      <span className="w-10 shrink-0 pt-[9px] text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1.5" onClick={() => inputRef.current?.focus()}>
        {value.map((c) => (
          <span key={c.email} title={c.email} className="flex h-6 max-w-full items-center gap-1 rounded-full border border-edge bg-panel pr-1 pl-2.5 text-[13px] text-ink">
            <span className="truncate">{c.name}</span>
            <button
              type="button"
              aria-label={`Remove ${c.email}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x.email !== c.email));
              }}
              className="grid size-4 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-icon hover:bg-btn-hover"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          aria-label={label}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            setActive(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (text.trim()) commitText(text);
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text');
            if (/[,;\s]/.test(pasted.trim())) {
              e.preventDefault();
              commitText(`${text} ${pasted}`);
            }
          }}
          onKeyDown={onKeyDown}
          className={`min-w-[120px] flex-1 border-0 bg-transparent py-0.5 text-sm outline-none ${invalid ? 'text-danger' : 'text-ink'}`}
        />
      </div>
      {children}

      {showList && (
        <ul role="listbox" className="absolute top-full left-10 z-20 m-0 mt-px w-[min(360px,90%)] list-none rounded bg-popover py-1 pl-0 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15),0_1px_2px_rgba(60,64,67,0.3)]">
          {suggestions.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 ${i === active ? 'bg-link-tint' : ''}`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium text-white" style={{ background: u.avatar_color }}>
                {u.name[0]}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] text-ink">{u.name}</span>
                <span className="block truncate text-xs text-muted">{u.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
