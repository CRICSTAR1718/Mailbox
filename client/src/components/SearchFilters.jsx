import { useState } from 'react';
import { buildQuery, EMPTY_FILTERS, parseQuery } from '../searchQuery.js';

function Field({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <label className="flex items-center gap-4 text-sm">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <input
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-0 flex-1 border-0 border-b border-edge bg-transparent text-sm outline-none focus:border-b-2 focus:border-primary"
      />
    </label>
  );
}

// Dropdown under the search box. It edits the same query string the box holds:
// fields become from:, to:, subject:, has:attachment and plain words.
export default function SearchFilters({ query, onSearch, onClose }) {
  const [f, setF] = useState(() => ({ ...EMPTY_FILTERS, ...parseQuery(query) }));
  const set = (key) => (value) => setF((cur) => ({ ...cur, [key]: value }));
  const built = buildQuery(f);

  const submit = (e) => {
    e.preventDefault();
    if (built) onSearch(built);
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Search filters"
      className="absolute top-full left-0 z-30 mt-1 w-full rounded-lg bg-popover p-5 shadow-[0_4px_6px_rgba(32,33,36,0.28)]"
    >
      <div className="flex flex-col gap-3">
        <Field label="From" value={f.from} onChange={set('from')} autoFocus />
        <Field label="To" value={f.to} onChange={set('to')} />
        <Field label="Subject" value={f.subject} onChange={set('subject')} />
        <Field label="Has the words" value={f.words} onChange={set('words')} />
        <label className="flex cursor-pointer items-center gap-4 text-sm">
          <span className="w-28 shrink-0 text-muted">Has attachment</span>
          <input type="checkbox" checked={f.hasAttachment} onChange={(e) => set('hasAttachment')(e.target.checked)} className="size-4 cursor-pointer accent-primary" />
        </label>
      </div>
      <p className="mt-4 mb-0 truncate text-xs text-muted" aria-live="polite">
        {built ? <>Search: <code>{built}</code></> : 'Fill in at least one field'}
      </p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button type="button" onClick={() => setF(EMPTY_FILTERS)} className="h-9 cursor-pointer rounded-full border-0 bg-transparent px-4 text-sm font-medium text-link hover:bg-link-tint">
          Clear
        </button>
        <button type="button" onClick={onClose} className="h-9 cursor-pointer rounded-full border-0 bg-transparent px-4 text-sm font-medium text-link hover:bg-link-tint">
          Cancel
        </button>
        <button type="submit" disabled={!built} className="h-9 cursor-pointer rounded-full border-0 bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:cursor-default disabled:opacity-50">
          Search
        </button>
      </div>
    </form>
  );
}
