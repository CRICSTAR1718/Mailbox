import { Archive, ArrowLeft, FolderInput, Inbox, Mail, MoreVertical, OctagonAlert, Trash2 } from 'lucide-react';
import Menu, { MenuItem } from '../ui/Menu.jsx';
import { ToolButton, MOVE_TARGETS } from './toolbarParts.jsx';
import LabelMenu from './LabelMenu.jsx';

// `folder` is where the conversation lives now; `labelIds` are labels present on any message.
export default function ThreadToolbar({ folder, labels, messages, onCreateLabel, important, starred, onBack, onAction, onToggleImportant }) {
  const outOfInbox = ['archive', 'trash', 'spam'].includes(folder);
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 pr-2 pl-2">
      {onBack && (
        <>
          <ToolButton label="Back to list" onClick={onBack}><ArrowLeft size={20} /></ToolButton>
          <span className="mx-1" />
        </>
      )}
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
      <ToolButton label="Mark as unread" onClick={() => onAction('unread')}><Mail size={20} /></ToolButton>
      <span className="mx-2 h-5 w-px bg-edge" />
      <Menu trigger={({ toggle }) => <ToolButton label="Move to" onClick={toggle}><FolderInput size={20} /></ToolButton>}>
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
        rows={messages}
        onToggle={(label, add) => onAction(add ? 'label' : 'unlabel', { label })}
        onCreate={onCreateLabel}
      />
      <Menu trigger={({ toggle }) => <ToolButton label="More" onClick={toggle}><MoreVertical size={20} /></ToolButton>}>
        {({ close }) => (
          <>
            <MenuItem onClick={() => { onAction(starred ? 'unstar' : 'star'); close(); }}>{starred ? 'Remove star' : 'Add star'}</MenuItem>
            <MenuItem onClick={() => { onToggleImportant(); close(); }}>{important ? 'Mark as not important' : 'Mark as important'}</MenuItem>
          </>
        )}
      </Menu>
    </div>
  );
}
