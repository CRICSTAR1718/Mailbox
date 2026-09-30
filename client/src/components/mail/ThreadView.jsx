import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Forward, Reply, X } from 'lucide-react';
import { api } from '../../api.js';
import { useMailbox } from '../../context/MailboxContext.jsx';
import { useMailActions } from '../../hooks/useMailActions.js';
import { useCompose } from '../../context/ComposeContext.jsx';
import { useShortcuts } from '../../context/ShortcutsContext.jsx';
import ThreadToolbar from './ThreadToolbar.jsx';
import MessageCard from './MessageCard.jsx';
import ReplyBox from './ReplyBox.jsx';
import { ThreadSkeleton } from '../ui/Skeletons.jsx';
import { useIsDesktop } from '../../hooks/useMediaQuery.js';

const FOLDER_CHIP = { inbox: 'Inbox', spam: 'Spam', trash: 'Trash' };

// Where the conversation "lives": inbox wins over spam/trash/archive; sent-only threads have no chip.
function threadFolder(messages) {
  const folders = new Set(messages.map((m) => m.folder));
  return ['inbox', 'spam', 'trash', 'archive', 'sent', 'drafts'].find((f) => folders.has(f));
}

// `split`: shown in the reading pane beside the list, so there is no "back" and the layout is narrow
export default function ThreadView({ threadId, backTo, split = false }) {
  const isDesktop = useIsDesktop();
  const narrow = !isDesktop || split;
  const indent = narrow ? 'px-4' : 'pr-6 pl-[72px]';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { labels, openCreateLabel } = useMailbox();
  const { bulk, toggleFlag } = useMailActions();
  const { notify } = useCompose();
  const id = Number(threadId);
  const key = useMemo(() => ['thread', id], [id]);

  const { data, isPending, error } = useQuery({ queryKey: key, queryFn: () => api(`/threads/${id}`), retry: false, meta: { silent: true } });

  const [overrides, setOverrides] = useState({}); // item_id -> expanded? (default: only the latest is open)
  const [composer, setComposer] = useState(null); // { mode: 'reply' | 'forward', message }

  // opening the conversation marks it read on the server, so refresh lists and counts
  useEffect(() => {
    if (data?.marked_read > 0) {
      for (const k of ['mail', 'counts', 'labels']) qc.invalidateQueries({ queryKey: [k] });
    }
  }, [data, qc]);

  const star = useMutation({
    mutationFn: ({ itemId, value }) => api(`/mail/${itemId}`, { method: 'PATCH', body: { is_starred: value } }),
    onMutate: async ({ itemId, value }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old && { ...old, messages: old.messages.map((m) => (m.item_id === itemId ? { ...m, is_starred: value } : m)) });
      return { previous };
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ['mail'] }),
  });

  const goBack = () => (!split && window.history.state?.idx > 0 ? navigate(-1) : navigate(backTo));

  const messages = data?.messages ?? [];
  const latest = messages[messages.length - 1];
  const folder = data && threadFolder(messages);
  const threadLabels = useMemo(() => {
    const seen = new Map();
    for (const m of messages) for (const l of m.labels) seen.set(l.id, l);
    return [...seen.values()];
  }, [messages]);

  const run = (action, extra = {}) => {
    if (action === 'delete' && !window.confirm('Delete this conversation forever? This can\'t be undone.')) return;
    const staysHere = action === 'label' || action === 'unlabel' || action === 'star' || action === 'unstar';
    // Re-fetching this thread would mark it read again, so only do it when staying on the page.
    bulk.mutate(
      { threadIds: [id], action, ...extra },
      staysHere ? { onSettled: () => qc.invalidateQueries({ queryKey: key }) } : undefined
    );
    if (!staysHere) goBack();
  };

  const toggleImportant = () =>
    toggleFlag.mutate(
      { itemId: latest.item_id, threadId: id, field: 'is_important', value: !latest.is_important },
      { onSettled: () => qc.invalidateQueries({ queryKey: key }) }
    );

  const onSent = (mode) => {
    setComposer(null);
    notify(mode === 'forward' ? 'Message forwarded.' : 'Message sent.');
    for (const k of ['thread', 'mail', 'counts']) qc.invalidateQueries({ queryKey: [k] });
  };

  useShortcuts({
    archive: () => folder !== 'archive' && run('archive'),
    trash: () => run(folder === 'trash' ? 'delete' : 'trash'),
    star: () => run(messages.some((m) => m.is_starred) ? 'unstar' : 'star'),
    back: goBack,
    read: () => run('read'),
    unread: () => run('unread'),
  });

  const open = (m) => overrides[m.item_id] ?? m === latest;

  return (
    <div className="flex h-full flex-col">
      <ThreadToolbar
        folder={folder}
        labels={labels}
        messages={messages}
        onCreateLabel={() => openCreateLabel((label) => run('label', { label }))}
        important={!!latest?.is_important}
        starred={messages.some((m) => m.is_starred)}
        onBack={split ? undefined : goBack}
        onAction={run}
        onToggleImportant={toggleImportant}
      />

      <div className="slim-scroll min-h-0 flex-1 overflow-y-auto pb-10">
        {isPending && <ThreadSkeleton narrow={narrow} />}
        {error && <p className={`${indent} text-sm text-muted`}>{error.message}</p>}
        {data && (
          <>
            <div className={`${indent} pb-3`}>
              <h1 className="m-0 mb-2 text-[22px] leading-7 font-normal text-ink">{data.subject}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {FOLDER_CHIP[folder] && (
                  <span className="flex items-center gap-1 rounded bg-tint-strong px-2 text-xs leading-5 text-ink">
                    {FOLDER_CHIP[folder]}
                    <button
                      type="button"
                      title={folder === 'inbox' ? 'Archive' : 'Move to inbox'}
                      aria-label={folder === 'inbox' ? 'Remove from inbox (archive)' : 'Move to inbox'}
                      onClick={() => run(folder === 'inbox' ? 'archive' : 'move', folder === 'inbox' ? {} : { folder: 'inbox' })}
                      className="grid size-4 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-icon hover:bg-btn-hover"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {threadLabels.map((l) => (
                  <span key={l.id} className="flex items-center gap-1 rounded px-2 text-xs leading-5 font-medium text-white" style={{ background: l.color }}>
                    {l.name}
                    <button
                      type="button"
                      title={`Remove label ${l.name}`}
                      aria-label={`Remove label ${l.name}`}
                      onClick={() => run('unlabel', { label: l })}
                      className="grid size-4 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-white hover:bg-btn-hover"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-line">
              {messages.map((m) => (
                <MessageCard
                  narrow={narrow}
                  key={m.item_id}
                  message={m}
                  expanded={open(m)}
                  onToggle={() => setOverrides((o) => ({ ...o, [m.item_id]: !open(m) }))}
                  onStar={(msg) => star.mutate({ itemId: msg.item_id, value: !msg.is_starred })}
                  onReply={(msg) => setComposer({ mode: 'reply', message: msg })}
                  onForward={(msg) => setComposer({ mode: 'forward', message: msg })}
                />
              ))}
            </div>

            <div className={indent}>
              {composer ? (
                <ReplyBox
                  key={`${composer.mode}-${composer.message.item_id}`}
                  mode={composer.mode}
                  message={composer.message}
                  subject={data.subject}
                  threadId={id}
                  onClose={() => setComposer(null)}
                  onSent={onSent}
                />
              ) : (
                <div className="mt-6 flex gap-3">
                  {[['reply', 'Reply', Reply], ['forward', 'Forward', Forward]].map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setComposer({ mode, message: latest })}
                      className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-outline bg-panel px-6 text-sm font-medium text-icon hover:bg-tint"
                    >
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
