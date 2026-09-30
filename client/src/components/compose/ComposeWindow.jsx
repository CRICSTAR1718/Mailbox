import { AtSign, Maximize2, Minimize2, Minus, Paperclip, Smile, Trash2, Type, X, Image, Link2 } from 'lucide-react';
import { useCompose } from '../../context/ComposeContext.jsx';
import RecipientField from './RecipientField.jsx';

const SAVE_TEXT = { saving: 'Saving…', saved: 'Draft saved', error: 'Couldn’t save draft' };

function HeaderButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid size-8 cursor-pointer place-items-center rounded border-0 bg-transparent text-white hover:bg-panel/15"
    >
      {children}
    </button>
  );
}

// Decorative toolbar icons (formatting, attach, emoji...) that don't do anything yet.
function VisualIcon({ label, children }) {
  return (
    <span title={`${label} (not available yet)`} aria-hidden="true" className="grid size-8 place-items-center rounded text-icon hover:bg-btn-hover">
      {children}
    </span>
  );
}

// On phones a window takes the whole screen, and only the newest is shown (the others keep their drafts).
export default function ComposeWindow({ win, modal = false, hiddenOnPhone = false }) {
  const { update, setLayout, closeWindow, discardWindow, sendWindow } = useCompose();
  const { key } = win;
  const title = win.subject.trim() || 'New Message';

  const shell = modal
    ? 'h-[min(720px,90vh)] w-[min(1000px,92vw)] rounded-lg'
    : `w-[540px] max-w-full min-w-[300px] shrink rounded-t-lg max-md:fixed max-md:z-50 max-md:w-full max-md:min-w-0 max-md:rounded-none ${
        win.minimized ? 'max-md:inset-x-0 max-md:bottom-0 max-md:h-10' : 'h-[min(560px,calc(100vh-72px))] max-md:inset-0 max-md:h-auto'
      } ${hiddenOnPhone ? 'max-md:hidden' : ''}`;

  return (
    <section
      role="dialog"
      aria-label={title}
      className={`pointer-events-auto flex flex-col overflow-hidden bg-popover shadow-[0_8px_10px_1px_rgba(0,0,0,0.14),0_3px_14px_2px_rgba(0,0,0,0.12),0_5px_5px_-3px_rgba(0,0,0,0.2)] ${shell}`}
    >
      <header
        onClick={() => !modal && setLayout(key, { minimized: !win.minimized })}
        className="flex h-10 shrink-0 cursor-pointer items-center bg-[#404040] pr-2 pl-4 text-sm font-medium text-white"
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {!modal && (
          <HeaderButton label={win.minimized ? 'Restore' : 'Minimize'} onClick={() => setLayout(key, { minimized: !win.minimized })}>
            <Minus size={16} />
          </HeaderButton>
        )}
        <HeaderButton label={modal ? 'Exit full screen' : 'Full screen'} onClick={() => setLayout(key, { fullscreen: !win.fullscreen, minimized: false })}>
          {modal ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </HeaderButton>
        <HeaderButton label="Save & close" onClick={() => closeWindow(key)}>
          <X size={17} />
        </HeaderButton>
      </header>

      {!win.minimized && (
        <>
          <div className="shrink-0 px-4">
            <RecipientField label="To" value={win.to} onChange={(to) => update(key, { to, error: '' })} autoFocus={win.to.length === 0}>
              <div className="flex shrink-0 gap-2 pt-[9px] pl-2 text-sm text-muted">
                {!win.showCc && (
                  <button type="button" onClick={() => setLayout(key, { showCc: true })} className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink hover:underline">
                    Cc
                  </button>
                )}
                {!win.showBcc && (
                  <button type="button" onClick={() => setLayout(key, { showBcc: true })} className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink hover:underline">
                    Bcc
                  </button>
                )}
              </div>
            </RecipientField>
            {win.showCc && <RecipientField label="Cc" value={win.cc} onChange={(cc) => update(key, { cc })} autoFocus={win.cc.length === 0} />}
            {win.showBcc && <RecipientField label="Bcc" value={win.bcc} onChange={(bcc) => update(key, { bcc })} autoFocus={win.bcc.length === 0} />}
            <input
              value={win.subject}
              onChange={(e) => update(key, { subject: e.target.value })}
              placeholder="Subject"
              aria-label="Subject"
              maxLength={998}
              className="h-10 w-full border-0 border-b border-line bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>

          <textarea
            value={win.body}
            onChange={(e) => update(key, { body: e.target.value })}
            aria-label="Message body"
            className="min-h-0 flex-1 resize-none border-0 bg-transparent px-4 py-3 font-[inherit] text-sm outline-none"
          />

          {win.error && <p role="alert" className="m-0 px-4 pb-1 text-xs text-danger">{win.error}</p>}

          <footer className="flex h-14 shrink-0 items-center gap-1 px-4">
            <button
              type="button"
              onClick={() => sendWindow(key)}
              className="mr-2 h-9 cursor-pointer rounded-full border-0 bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover hover:shadow-md"
            >
              Send
            </button>
            <VisualIcon label="Formatting options"><Type size={18} /></VisualIcon>
            <VisualIcon label="Attach files"><Paperclip size={18} /></VisualIcon>
            <VisualIcon label="Insert link"><Link2 size={18} /></VisualIcon>
            <VisualIcon label="Insert emoji"><Smile size={18} /></VisualIcon>
            <VisualIcon label="Insert photo"><Image size={18} /></VisualIcon>
            <VisualIcon label="Mention"><AtSign size={18} /></VisualIcon>
            <span className={`ml-auto mr-2 text-xs ${win.saveState === 'error' ? 'text-danger' : 'text-muted'}`} aria-live="polite">
              {SAVE_TEXT[win.saveState] ?? ''}
            </span>
            <button
              type="button"
              title="Discard draft"
              aria-label="Discard draft"
              onClick={() => discardWindow(key)}
              className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
            >
              <Trash2 size={18} />
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
