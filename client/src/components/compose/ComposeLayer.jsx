import { X } from 'lucide-react';
import { useCompose } from '../../context/ComposeContext.jsx';
import ComposeWindow from './ComposeWindow.jsx';

function Toast({ toast }) {
  const { undoSend, viewSent, reopenFailed, dismissToast } = useCompose();
  const action = 'cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-[#8ab4f8] hover:text-[#aecbfa]';
  return (
    <div role="status" className="pointer-events-auto flex min-w-[288px] items-center gap-6 rounded bg-[#202124] px-4 py-3.5 text-sm text-white shadow-lg">
      <span className="flex-1">
        {toast.kind === 'info' || toast.kind === 'failed' ? toast.text : toast.kind === 'pending' || toast.kind === 'sent' ? 'Message sent' : ''}
      </span>
      {toast.kind === 'info' && toast.undo && (
        <button
          type="button"
          className={action}
          onClick={() => {
            toast.undo();
            dismissToast(toast.id);
          }}
        >
          Undo
        </button>
      )}
      {toast.kind === 'pending' && (
        <>
          <button type="button" className={action} onClick={() => undoSend(toast.id)}>Undo</button>
          <button type="button" className={action} onClick={() => viewSent(toast)}>View message</button>
        </>
      )}
      {toast.kind === 'sent' && <button type="button" className={action} onClick={() => viewSent(toast)}>View message</button>}
      {toast.kind === 'failed' && <button type="button" className={action} onClick={() => reopenFailed(toast)}>Reopen</button>}
      {toast.kind !== 'pending' && (
        <button type="button" aria-label="Dismiss" onClick={() => dismissToast(toast.id)} className="grid size-6 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-white/80 hover:bg-panel/15">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

// Compose windows (bottom-right row, plus one full-screen modal) and the toast stack.
export default function ComposeLayer() {
  const { windows, toasts } = useCompose();
  const full = windows.find((w) => w.fullscreen);
  const docked = windows.filter((w) => !w.fullscreen);

  return (
    <>
      {/* newest window is rightmost; the row shrinks windows below 540px when space runs out */}
      <div className="pointer-events-none fixed right-6 bottom-0 z-40 flex max-w-[calc(100vw-48px)] flex-row-reverse items-end gap-4">
        {[...docked].reverse().map((w, i) => (
          <ComposeWindow key={w.key} win={w} hiddenOnPhone={i > 0} />
        ))}
      </div>

      {full && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <ComposeWindow win={full} modal />
        </div>
      )}

      <div className="pointer-events-none fixed bottom-6 left-6 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </div>
    </>
  );
}
