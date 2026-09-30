import { memo } from 'react';
import { Archive, Clock, Mail, MailOpen, Paperclip, Star, Trash2 } from 'lucide-react';
import Checkbox from '../ui/Checkbox.jsx';
import { formatDate } from '../../format.js';
import { ME } from '../../currentUser.js';

const GOLD = '#f4b400';

// Material "label_important" glyph: Gmail's important marker.
function ImportantMarker({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M3.5 18.99l11 .01c.67 0 1.27-.33 1.63-.84L20.5 12l-4.37-6.16c-.36-.51-.96-.84-1.63-.84l-11 .01L8.5 12z"
        fill={on ? GOLD : 'none'}
        stroke={on ? GOLD : '#747775'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HoverAction({ label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
    >
      {children}
    </button>
  );
}

function senderName(row, folder) {
  if (folder === 'drafts') return <span className="text-danger">Draft</span>;
  if (row.from.id === ME.id) return 'me';
  return row.message_count > 1 ? row.from.name.split(' ')[0] : row.from.name;
}

function StarButton({ row, onFlag }) {
  return (
    <button
      type="button"
      title={row.is_starred ? 'Starred' : 'Not starred'}
      aria-label={row.is_starred ? 'Remove star' : 'Add star'}
      aria-pressed={row.is_starred}
      onClick={(e) => {
        e.stopPropagation();
        onFlag(row, 'is_starred');
      }}
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent hover:bg-btn-hover"
    >
      <Star size={20} strokeWidth={1.75} color={row.is_starred ? GOLD : '#747775'} fill={row.is_starred ? GOLD : 'none'} />
    </button>
  );
}

function LabelChips({ labels }) {
  return labels.map((l) => (
    <span key={l.id} className="shrink-0 rounded-[4px] px-1.5 text-xs leading-[18px] font-medium text-white" style={{ background: l.color }}>
      {l.name}
    </span>
  ));
}

// `stacked` is the narrow layout (phones, or the list beside a reading pane): sender and date on the
// first line, subject and snippet on the second. Otherwise everything sits on one 40px line.
function MailRow({ row, folder, selected, focused, active, stacked, onSelect, onOpen, onFlag, onRowAction }) {
  const unread = !row.is_read;
  const bg = selected ? 'bg-row-selected' : active ? 'bg-active' : unread ? 'bg-panel' : 'bg-read-row';
  const strong = unread ? 'font-bold' : '';
  const shell = `group relative flex cursor-pointer border-b border-row text-sm text-ink hover:z-10 hover:shadow-[inset_1px_0_0_var(--color-edge),inset_-1px_0_0_var(--color-edge),0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] ${bg}`;
  const open = {
    role: 'link',
    tabIndex: 0,
    'data-thread-id': row.thread_id,
    onClick: () => onOpen(row),
    onKeyDown: (e) => e.key === 'Enter' && onOpen(row),
  };
  const focusBar = focused && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />;

  if (stacked) {
    return (
      <div {...open} className={`${shell} items-start py-2 pr-3 pl-1`}>
        {focusBar}
        <div className="flex shrink-0 flex-col items-center">
          <Checkbox checked={selected} onChange={() => onSelect(row.thread_id)} label="Select conversation" />
          <StarButton row={row} onFlag={onFlag} />
        </div>
        <div className="ml-1 min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate ${strong}`}>
              {senderName(row, folder)}
              {row.message_count > 1 && <span className="ml-1 text-xs font-normal text-muted">{row.message_count}</span>}
            </span>
            {row.has_attachment && <Paperclip size={14} aria-label="Has attachment" className="shrink-0 text-icon" />}
            <span className={`shrink-0 text-xs ${strong}`}>{formatDate(row.sent_at)}</span>
          </div>
          <div className={`mt-0.5 truncate ${strong}`}>{row.subject || '(no subject)'}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <LabelChips labels={row.labels} />
            <span className="min-w-0 truncate text-muted">{row.snippet}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...open} className={`${shell} h-[var(--row-h)] items-center pl-2`}>
      {focusBar}
      <Checkbox checked={selected} onChange={() => onSelect(row.thread_id)} label="Select conversation" />
      <StarButton row={row} onFlag={onFlag} />

      <button
        type="button"
        title={row.is_important ? 'Marked as important' : 'Mark as important'}
        aria-label={row.is_important ? 'Mark as not important' : 'Mark as important'}
        aria-pressed={row.is_important}
        onClick={(e) => {
          e.stopPropagation();
          onFlag(row, 'is_important');
        }}
        className={`mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent hover:bg-btn-hover ${
          row.is_important ? '' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <ImportantMarker on={row.is_important} />
      </button>

      <div className={`w-[168px] shrink-0 truncate pr-4 ${strong}`}>
        {senderName(row, folder)}
        {row.message_count > 1 && <span className="ml-1 text-xs font-normal text-muted">{row.message_count}</span>}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 pr-4">
        <LabelChips labels={row.labels} />
        <span className="min-w-0 truncate">
          <span className={strong}>{row.subject || '(no subject)'}</span>
          <span className="text-muted"> - {row.snippet}</span>
        </span>
      </div>

      {row.has_attachment && (
        <span title="Has attachment" className="mr-2 grid h-6 shrink-0 place-items-center rounded-full border border-edge bg-panel px-2 text-icon">
          <Paperclip size={14} />
        </span>
      )}

      <div className="relative h-full w-[92px] shrink-0 bg-inherit pr-4 text-right text-xs">
        <span className={`flex h-full items-center justify-end group-hover:invisible ${strong}`}>{formatDate(row.sent_at)}</span>
        <div className="absolute inset-y-0 right-0 hidden w-[136px] items-center justify-end bg-inherit pr-2 group-hover:flex">
          {folder !== 'archive' && (
            <HoverAction label="Archive" onClick={() => onRowAction(row, 'archive')}>
              <Archive size={18} />
            </HoverAction>
          )}
          <HoverAction label={folder === 'trash' ? 'Delete forever' : 'Delete'} onClick={() => onRowAction(row, folder === 'trash' ? 'delete' : 'trash')}>
            <Trash2 size={18} />
          </HoverAction>
          <HoverAction label={unread ? 'Mark as read' : 'Mark as unread'} onClick={() => onRowAction(row, unread ? 'read' : 'unread')}>
            {unread ? <MailOpen size={18} /> : <Mail size={18} />}
          </HoverAction>
          <HoverAction label="Snooze (not available yet)" onClick={() => {}}>
            <Clock size={18} />
          </HoverAction>
        </div>
      </div>
    </div>
  );
}

export default memo(MailRow);
