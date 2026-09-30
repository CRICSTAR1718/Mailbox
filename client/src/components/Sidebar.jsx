import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Archive, ChevronDown, ChevronUp, Clock, File, Inbox, MoreVertical, OctagonAlert, Pencil, Plus, Send, Star, Tag, Trash2,
} from 'lucide-react';
import { useMailbox } from '../context/MailboxContext.jsx';
import { useCompose } from '../context/ComposeContext.jsx';
import Menu, { MenuItem } from './ui/Menu.jsx';

const MAIN = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'snoozed', label: 'Snoozed', icon: Clock },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'drafts', label: 'Drafts', icon: File },
];
const MORE = [
  { key: 'spam', label: 'Spam', icon: OctagonAlert },
  { key: 'trash', label: 'Trash', icon: Trash2 },
  { key: 'archive', label: 'Archive', icon: Archive },
];

// Gmail shows unread for inbox/spam and the total for drafts; other folders show nothing.
function countFor(counts, key) {
  const f = counts?.folders?.[key];
  if (!f) return 0;
  if (key === 'drafts') return f.total;
  return key === 'inbox' || key === 'spam' ? f.unread : 0;
}

function NavItem({ to, icon: Icon, label, count = 0, collapsed, iconColor, fillIcon, hideCountOnHover }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex h-8 items-center text-sm no-underline',
          collapsed ? 'mx-auto w-14 justify-center rounded-2xl' : 'mr-3 rounded-r-full pr-3 pl-[26px]',
          isActive ? 'bg-active text-compose-ink' : 'text-ink hover:bg-hover',
          isActive || count > 0 ? 'font-bold' : '',
        ].join(' ')
      }
    >
      <Icon
        size={20}
        className="shrink-0"
        style={iconColor ? { color: iconColor, fill: fillIcon ? iconColor : 'none' } : undefined}
      />
      {!collapsed && (
        <>
          <span className="ml-[18px] flex-1 truncate">{label}</span>
          {count > 0 && (
            <span className={`ml-2 text-xs font-bold ${hideCountOnHover ? 'group-focus-within:invisible group-hover:invisible' : ''}`}>{count}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

function ToggleItem({ icon: Icon, label, onClick, collapsed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex h-8 cursor-pointer items-center border-0 bg-transparent text-sm text-ink hover:bg-hover ${
        collapsed ? 'mx-auto w-14 justify-center rounded-2xl' : 'mr-3 w-[calc(100%-12px)] rounded-r-full pr-3 pl-[26px]'
      }`}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && <span className="ml-[18px]">{label}</span>}
    </button>
  );
}

// `drawer`: phone layout, where the sidebar slides in over the page instead of sitting beside it
export default function Sidebar({ collapsed, drawer = false, open = false, onClose }) {
  const { counts, labels, openCreateLabel, requestDeleteLabel } = useMailbox();
  const { openCompose } = useCompose();
  const { pathname } = useLocation();
  const inMore = MORE.some((m) => pathname.startsWith(`/mail/${m.key}`));
  const [moreOpen, setMoreOpen] = useState(inMore);
  const showMore = moreOpen || inMore;

  useEffect(() => {
    if (inMore) setMoreOpen(true);
  }, [inMore]);

  const item = (f) => (
    <NavItem
      key={f.key}
      to={`/mail/${f.key}`}
      icon={f.icon}
      label={f.label}
      count={countFor(counts, f.key)}
      collapsed={collapsed}
    />
  );

  return (
    <nav
      aria-label="Mailbox folders"
      aria-hidden={drawer && !open}
      inert={drawer && !open}
      className={`slim-scroll overflow-x-hidden overflow-y-auto pb-4 ${
        drawer
          ? `fixed inset-y-0 left-0 z-50 w-64 bg-surface pt-2 shadow-xl transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`
          : `shrink-0 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-64'}`
      }`}
    >
      <button
        type="button"
        title="Compose"
        
        onClick={() => {
          openCompose();
          onClose?.();
        }}
        className={`mt-2 mb-4 flex h-14 cursor-pointer items-center rounded-2xl border-0 bg-compose text-sm font-medium text-compose-ink shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] ${
          collapsed ? 'mx-auto w-14 justify-center' : 'ml-2 gap-4 pr-6 pl-4'
        }`}
      >
        <Pencil size={24} className="shrink-0" />
        {!collapsed && <span>Compose</span>}
      </button>

      <div className="flex flex-col">
        {MAIN.map(item)}
        {showMore && MORE.map(item)}
        <ToggleItem
          icon={showMore ? ChevronUp : ChevronDown}
          label={showMore ? 'Less' : 'More'}
          collapsed={collapsed}
          onClick={() => setMoreOpen(!showMore)}
        />
      </div>

      {!collapsed && (
        <div className="mt-2">
          <div className="flex h-8 items-center justify-between pr-4 pl-[26px]">
            <h2 className="m-0 text-sm font-medium text-ink">Labels</h2>
            <button
              type="button"
              title="Create new label"
              aria-label="Create new label"
              onClick={() => openCreateLabel()}
              className="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-col">
            {labels.map((l) => (
              <div key={l.id} className="group relative">
                <NavItem
                  to={`/label/${l.id}`}
                  icon={Tag}
                  label={l.name}
                  count={l.unread_count}
                  iconColor={l.color}
                  fillIcon
                  hideCountOnHover
                />
                <div className="absolute inset-y-0 right-5 hidden items-center group-focus-within:flex group-hover:flex">
                  <Menu
                    align="right"
                    trigger={({ toggle }) => (
                      <button
                        type="button"
                        title="Label actions"
                        aria-label={`Actions for label ${l.name}`}
                        onClick={toggle}
                        className="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
                      >
                        <MoreVertical size={16} />
                      </button>
                    )}
                  >
                    {({ close }) => (
                      <MenuItem icon={Trash2} onClick={() => { close(); requestDeleteLabel(l); }}>
                        Remove label
                      </MenuItem>
                    )}
                  </Menu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
