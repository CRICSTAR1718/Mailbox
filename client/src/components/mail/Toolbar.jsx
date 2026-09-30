import {
  Archive, ChevronDown, ChevronLeft, ChevronRight, FolderInput, Inbox, Mail, MailOpen, MoreVertical,
  OctagonAlert, RefreshCw, Trash2,
} from 'lucide-react';
import Checkbox from '../ui/Checkbox.jsx';
import Menu, { MenuItem } from '../ui/Menu.jsx';
import { ToolButton, MOVE_TARGETS } from './toolbarParts.jsx';
import LabelMenu from './LabelMenu.jsx';

export default function Toolbar({
  folder, selectedRows, allState, labels, refreshing,
  onToggleAll, onSelectKind, onRefresh, onAction, onMarkAllRead, onCreateLabel,
  page, limit, shown, total, onPage,
}) {
  const hasSelection = selectedRows.length > 0;
  const anyUnread = selectedRows.some((r) => !r.is_read);
  const outOfInbox = ['archive', 'trash', 'spam'].includes(folder);
  const start = shown ? (page - 1) * limit + 1 : 0;
  const end = shown ? start + shown - 1 : 0;

  return (
    <div className="flex h-12 shrink-0 items-center gap-1 pr-2 pl-2">
      <div className="flex items-center">
        <Checkbox checked={allState === 'all'} mixed={allState === 'some'} onChange={onToggleAll} label="Select all" />
        <Menu
          trigger={({ toggle }) => (
            <button
              type="button"
              title="Select"
              aria-label="Select options"
              onClick={toggle}
              className="grid h-8 w-5 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
            >
              <ChevronDown size={16} />
            </button>
          )}
        >
          {({ close }) =>
            ['All', 'None', 'Read', 'Unread', 'Starred'].map((kind) => (
              <MenuItem key={kind} onClick={() => { onSelectKind(kind); close(); }}>{kind}</MenuItem>
            ))
          }
        </Menu>
      </div>

      {hasSelection ? (
        <div className="ml-2 flex items-center">
          {outOfInbox ? (
            <ToolButton label="Move to inbox" onClick={() => onAction('move', { folder: 'inbox' })}><Inbox size={20} /></ToolButton>
          ) : (
            <ToolButton label="Archive" onClick={() => onAction('archive')}><Archive size={20} /></ToolButton>
          )}
          {folder === 'spam' ? (
            <ToolButton label="Not spam" onClick={() => onAction('move', { folder: 'inbox' })}><OctagonAlert size={20} /></ToolButton>
          ) : (
            <ToolButton label="Report spam" onClick={() => onAction('spam')}><OctagonAlert size={20} /></ToolButton>
          )}
          <ToolButton label={folder === 'trash' ? 'Delete forever' : 'Delete'} onClick={() => onAction(folder === 'trash' ? 'delete' : 'trash')}>
            <Trash2 size={20} />
          </ToolButton>
          <span className="mx-2 h-5 w-px bg-edge" />
          <ToolButton label={anyUnread ? 'Mark as read' : 'Mark as unread'} onClick={() => onAction(anyUnread ? 'read' : 'unread')}>
            {anyUnread ? <MailOpen size={20} /> : <Mail size={20} />}
          </ToolButton>
          <span className="mx-2 h-5 w-px bg-edge" />
          <Menu
            trigger={({ toggle }) => (
              <ToolButton label="Move to" onClick={toggle}><FolderInput size={20} /></ToolButton>
            )}
          >
            {({ close }) =>
              MOVE_TARGETS.filter((t) => t.folder !== folder).map((t) => (
                <MenuItem key={t.folder} icon={t.icon} onClick={() => { onAction('move', { folder: t.folder }); close(); }}>
                  {t.label}
                </MenuItem>
              ))
            }
          </Menu>
          <LabelMenu
            labels={labels}
            rows={selectedRows}
            onToggle={(label, add) => onAction(add ? 'label' : 'unlabel', { label })}
            onCreate={() => onCreateLabel(selectedRows)}
          />
          <Menu
            align="left"
            trigger={({ toggle }) => (
              <ToolButton label="More" onClick={toggle}><MoreVertical size={20} /></ToolButton>
            )}
          >
            {({ close }) => (
              <>
                <MenuItem onClick={() => { onAction('star'); close(); }}>Add star</MenuItem>
                <MenuItem onClick={() => { onAction('unstar'); close(); }}>Remove star</MenuItem>
              </>
            )}
          </Menu>
        </div>
      ) : (
        <div className="ml-2 flex items-center">
          <ToolButton label="Refresh" onClick={onRefresh}>
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </ToolButton>
          <Menu
            trigger={({ toggle }) => (
              <ToolButton label="More" onClick={toggle}><MoreVertical size={20} /></ToolButton>
            )}
          >
            {({ close }) => (
              <MenuItem onClick={() => { onMarkAllRead(); close(); }}>Mark all as read</MenuItem>
            )}
          </Menu>
        </div>
      )}

      <div className="ml-auto flex items-center text-xs text-muted">
        {total > 0 && (
          <span className="mr-2 whitespace-nowrap">
            {start}–{end} of {total}
          </span>
        )}
        <ToolButton label="Newer" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={20} /></ToolButton>
        <ToolButton label="Older" disabled={end >= total} onClick={() => onPage(page + 1)}><ChevronRight size={20} /></ToolButton>
      </div>
    </div>
  );
}
