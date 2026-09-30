import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useToast } from '../context/ComposeContext.jsx';

const FOLDER_ACTIONS = new Set(['archive', 'trash', 'spam', 'move', 'delete']);
const FLAG_PATCH = {
  read: { is_read: true },
  unread: { is_read: false },
  star: { is_starred: true },
  unstar: { is_starred: false },
};
const FOLDER_NAMES = { inbox: 'Inbox', spam: 'Spam', trash: 'Trash', archive: 'Archive' };
const VERBS = {
  archive: 'archived',
  trash: 'moved to Trash',
  spam: 'reported as spam',
  delete: 'deleted forever',
  read: 'marked as read',
  unread: 'marked as unread',
  star: 'starred',
  unstar: 'unstarred',
};

const subject = (n) => (n === 1 ? 'Conversation' : `${n} conversations`);

function describe({ action, folder, label, threadIds }) {
  if (action === 'label') return `Label “${label.name}” applied.`;
  if (action === 'unlabel') return `Label “${label.name}” removed.`;
  const verb = action === 'move' ? `moved to ${FOLDER_NAMES[folder]}` : VERBS[action];
  return `${subject(threadIds.length)} ${verb}.`;
}

// Mutations on the cached mail lists. Each updates the cache immediately (optimistic),
// rolls back if the request fails, refetches once settled, and reports with a toast.
// Moves (archive / trash / spam / move-to) get an Undo that restores the previous folders.
export function useMailActions() {
  const qc = useQueryClient();
  const { notify } = useToast();

  const begin = async () => {
    await qc.cancelQueries({ queryKey: ['mail'] });
    return { snapshot: qc.getQueriesData({ queryKey: ['mail'] }) };
  };
  const rollback = (_err, _vars, ctx) => ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
  const settle = () => {
    for (const key of ['mail', 'counts', 'labels']) qc.invalidateQueries({ queryKey: [key] });
  };
  const edit = (fn) => qc.setQueriesData({ queryKey: ['mail'] }, (old) => (old ? fn(old) : old));

  // star / important on one thread's latest message
  const toggleFlag = useMutation({
    mutationFn: ({ itemId, field, value }) => api(`/mail/${itemId}`, { method: 'PATCH', body: { [field]: value } }),
    onMutate: async ({ threadId, field, value }) => {
      const ctx = await begin();
      edit((old) => ({
        ...old,
        threads: old.threads.map((t) => (t.thread_id === threadId ? { ...t, [field]: value } : t)),
      }));
      return ctx;
    },
    onError: (err, vars, ctx) => {
      rollback(err, vars, ctx);
      notify(`Couldn’t update the conversation: ${err.message}`);
    },
    onSettled: settle,
  });

  const restore = useMutation({
    mutationFn: (items) => api('/mail/bulk', { method: 'POST', body: { action: 'restore', items } }),
    onSuccess: () => notify('Action undone.'),
    onError: (err) => notify(`Couldn’t undo: ${err.message}`),
    onSettled: () => {
      settle();
      qc.invalidateQueries({ queryKey: ['thread'] });
    },
  });

  // read/unread/star/unstar/archive/trash/spam/move/delete/label/unlabel over whole threads
  const bulk = useMutation({
    mutationFn: ({ threadIds, action, folder, label }) =>
      api('/mail/bulk', { method: 'POST', body: { threadIds, action, folder, labelId: label?.id } }),
    onMutate: async ({ threadIds, action, label }) => {
      const ctx = await begin();
      const ids = new Set(threadIds);
      edit((old) => {
        if (FOLDER_ACTIONS.has(action)) {
          const threads = old.threads.filter((t) => !ids.has(t.thread_id));
          return { ...old, threads, total: Math.max(0, old.total - (old.threads.length - threads.length)) };
        }
        const change = (t) => {
          if (action === 'label') {
            return t.labels.some((l) => l.id === label.id) ? t : { ...t, labels: [...t.labels, label] };
          }
          if (action === 'unlabel') return { ...t, labels: t.labels.filter((l) => l.id !== label.id) };
          return { ...t, ...FLAG_PATCH[action] };
        };
        return { ...old, threads: old.threads.map((t) => (ids.has(t.thread_id) ? change(t) : t)) };
      });
      return ctx;
    },
    onSuccess: (res, vars) => {
      const undo = res.previous?.length ? () => restore.mutate(res.previous) : undefined;
      notify(describe(vars), { undo });
    },
    onError: (err, vars, ctx) => {
      rollback(err, vars, ctx);
      notify(`Couldn’t complete that action: ${err.message}`);
    },
    onSettled: settle,
  });

  return { toggleFlag, bulk };
}
