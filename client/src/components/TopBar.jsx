import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CircleHelp, Grip, Mail, Menu, Search, Settings, SlidersHorizontal, X } from 'lucide-react';
import { ME } from '../currentUser.js';
import SearchFilters from './SearchFilters.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

function IconButton({ children, label, onClick, className = '' }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid size-12 shrink-0 cursor-pointer place-items-center rounded-full text-icon hover:bg-btn-hover ${className}`}
    >
      {children}
    </button>
  );
}

export default function TopBar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const urlQuery = pathname === '/search' ? params.get('q') ?? '' : '';
  const [query, setQuery] = useState(urlQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const boxRef = useRef(null);
  const { settingsOpen, toggleSettings } = useSettings();

  // keep the box in sync when the URL changes (back/forward, leaving search)
  useEffect(() => setQuery(urlQuery), [urlQuery]);

  useEffect(() => {
    if (!filtersOpen) return undefined;
    const onDown = (e) => !boxRef.current?.contains(e.target) && setFiltersOpen(false);
    const onKey = (e) => e.key === 'Escape' && setFiltersOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const search = (text) => {
    const q = text.trim();
    if (!q) return;
    setQuery(q);
    setFiltersOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-1 pr-2 pl-1 md:gap-2 md:pr-4">
      <div className="flex shrink-0 items-center md:w-[232px]">
        <IconButton label="Main menu" onClick={onToggleSidebar} className="mx-1">
          <Menu size={24} />
        </IconButton>
        <Link to="/mail/inbox" className="flex items-center gap-2 pl-1 no-underline">
          <Mail size={30} strokeWidth={2} className="text-danger" />
          <span className="hidden text-[22px] leading-none text-icon md:inline">Mailbox</span>
        </Link>
      </div>

      <div ref={boxRef} className="relative min-w-0 max-w-[720px] flex-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(query);
          }}
          role="search"
          className={`flex h-12 items-center rounded-full ${
            filtersOpen ? 'bg-panel shadow-[0_1px_1px_rgba(65,69,73,0.3),0_1px_3px_1px_rgba(65,69,73,0.15)]' : 'bg-search focus-within:bg-panel focus-within:shadow-[0_1px_1px_rgba(65,69,73,0.3),0_1px_3px_1px_rgba(65,69,73,0.15)]'
          }`}
        >
          <button type="submit" title="Search" aria-label="Search" className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full text-icon hover:bg-btn-hover">
            <Search size={22} />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
            placeholder="Search mail"
            aria-label="Search mail"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              title="Clear search"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full text-icon hover:bg-btn-hover"
            >
              <X size={22} />
            </button>
          )}
          <button
            type="button"
            title="Show search options"
            aria-label="Show search options"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
            className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full text-icon hover:bg-btn-hover"
          >
            <SlidersHorizontal size={22} />
          </button>
        </form>
        {filtersOpen && <SearchFilters query={query} onSearch={search} onClose={() => setFiltersOpen(false)} />}
      </div>

      <div className="ml-auto flex items-center">
        <IconButton label="Support" className="max-md:hidden"><CircleHelp size={24} /></IconButton>
        <IconButton label="Settings" onClick={toggleSettings} className={settingsOpen ? 'bg-btn-hover' : ''}><Settings size={24} /></IconButton>
        <IconButton label="Mailbox apps" className="max-md:hidden"><Grip size={24} /></IconButton>
        <button
          type="button"
          title={ME.name}
          aria-label={`Account: ${ME.name}`}
          className="ml-1 grid size-8 md:ml-2 cursor-pointer place-items-center rounded-full text-sm font-medium text-white"
          style={{ background: ME.color }}
        >
          {ME.name[0]}
        </button>
      </div>
    </header>
  );
}
