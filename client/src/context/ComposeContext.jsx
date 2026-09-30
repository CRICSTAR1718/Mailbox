import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { onReportedError } from '../errorBus.js';

const MAX_WINDOWS = 3;
const AUTOSAVE_MS = 3000;
const UNDO_MS = 5000;

const ComposeContext = createContext(null);

let windowSeq = 0;
let toastSeq = 0;

const blankWindow = () => ({
  key: ++windowSeq,
  draftId: null, // mailbox item id of the saved draft, once one exists
  to: [], cc: [], bcc: [], // [{ email, name }]
  subject: '', body: '',
  showCc: false, showBcc: false,
  minimized: false, fullscreen: false,
  version: 0, dirty: false, saveState: 'idle', error: '',
});

const hasContent = (w) => w.to.length + w.cc.length + w.bcc.length > 0 || w.subject.trim() !== '' || w.body.trim() !== '';
const payloadOf = (w) => ({
  to: w.to.map((r) => r.email),
  cc: w.cc.map((r) => r.email),
  bcc: w.bcc.map((r) => r.email),
  subject: w.subject,
  body: w.body,
});
const toChips = (users = []) => users.map((u) => ({ email: u.email, name: u.name }));

// Compose windows (with draft autosave), delayed send with undo, and toasts.
export function ComposeProvider({ children }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [windows, setWindows] = useState([]);
  const [toasts, setToasts] = useState([]);

  const ref = useRef([]); // always-current copy of `windows` for async code
  const timers = useRef(new Map()); // window key -> autosave timer
  const saving = useRef(new Map()); // window key -> promise of the save queue tail
  const pending = useRef(new Map()); // toast id -> { timer, snapshot, promise }

  const commit = useCallback((fn) => {
    ref.current = fn(ref.current);
    setWindows(ref.current);
  }, []);
  const patchWindow = useCallback(
    (key, fn) => commit((ws) => ws.map((w) => (w.key === key ? { ...w, ...fn(w) } : w))),
    [commit]
  );
  const getWindow = (key) => ref.current.find((w) => w.key === key);
  const refreshLists = useCallback(() => {
    for (const k of ['mail', 'counts']) qc.invalidateQueries({ queryKey: [k] });
  }, [qc]);

  // ---- toasts
  const patchToast = useCallback((id, patch) => setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))), []);
  const dismissToast = useCallback((id) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const pushToast = useCallback((toast, ttl) => {
    const id = ++toastSeq;
    setToasts((ts) => [...ts, { id, ...toast }]);
    if (ttl) setTimeout(() => dismissToast(id), ttl);
    return id;
  }, [dismissToast]);
  // plain toast, optionally with an Undo action
  const notify = useCallback(
    (text, { undo } = {}) => pushToast({ kind: 'info', text, undo }, undo ? 7000 : 4000),
    [pushToast]
  );

  // failed API calls elsewhere (see main.jsx) arrive here; repeats of one message are shown once per 30s
  useEffect(() => {
    const recent = new Map();
    return onReportedError((message) => {
      const now = Date.now();
      if (now - (recent.get(message) ?? 0) < 30_000) return;
      recent.set(message, now);
      notify(message);
    });
  }, [notify]);

  // ---- draft autosave (POST the first time, PUT afterwards; saves for one window never overlap)
  const doSave = useCallback(async (key) => {
    const w = getWindow(key);
    if (!w?.dirty) return;
    if (!w.draftId && !hasContent(w)) {
      patchWindow(key, () => ({ dirty: false }));
      return;
    }
    const version = w.version;
    patchWindow(key, () => ({ saveState: 'saving' }));
    try {
      const draft = w.draftId
        ? await api(`/drafts/${w.draftId}`, { method: 'PUT', body: payloadOf(w) })
        : await api('/drafts', { method: 'POST', body: payloadOf(w) });
      // edits made while saving keep the window dirty; their own timer will save them
      patchWindow(key, (cur) => ({ draftId: draft.id, saveState: 'saved', error: '', dirty: cur.version !== version }));
      refreshLists();
    } catch (err) {
      patchWindow(key, () => ({ saveState: 'error', error: err.message }));
    }
  }, [patchWindow, refreshLists]);

  const save = useCallback((key) => {
    const run = (saving.current.get(key) ?? Promise.resolve()).then(() => doSave(key));
    saving.current.set(key, run);
    run.finally(() => saving.current.get(key) === run && saving.current.delete(key));
    return run;
  }, [doSave]);

  const cancelTimer = (key) => {
    clearTimeout(timers.current.get(key));
    timers.current.delete(key);
  };
  const settle = async (key) => {
    cancelTimer(key);
    await saving.current.get(key);
  };

  // ---- windows
  const update = useCallback((key, patch) => {
    patchWindow(key, (w) => ({ ...patch, version: w.version + 1, dirty: true, saveState: 'idle' }));
    cancelTimer(key);
    timers.current.set(key, setTimeout(() => save(key), AUTOSAVE_MS));
  }, [patchWindow, save]);

  const setLayout = useCallback((key, patch) => patchWindow(key, () => patch), [patchWindow]);

  const removeWindow = (key) => commit((ws) => ws.filter((w) => w.key !== key));

  const openWindow = useCallback((initial = {}) => {
    if (ref.current.length >= MAX_WINDOWS) {
      notify(`You can have up to ${MAX_WINDOWS} messages open at once.`);
      return null;
    }
    const w = { ...blankWindow(), ...initial };
    commit((ws) => [...ws, w]);
    return w.key;
  }, [commit, notify]);

  const openCompose = useCallback((initial) => openWindow(initial), [openWindow]);

  // Reopen a saved draft from the Drafts folder.
  const openDraft = useCallback(async (row) => {
    const open = ref.current.find((w) => w.draftId === row.item_id);
    if (open) {
      patchWindow(open.key, () => ({ minimized: false }));
      return;
    }
    try {
      const { messages } = await api(`/threads/${row.thread_id}`);
      const m = messages.find((x) => x.item_id === row.item_id) ?? messages[0];
      openWindow({
        draftId: m.item_id,
        to: toChips(m.to), cc: toChips(m.cc), bcc: toChips(m.bcc),
        showCc: m.cc.length > 0, showBcc: m.bcc.length > 0,
        subject: m.subject, body: m.body_text, saveState: 'saved',
      });
    } catch (err) {
      notify(`Couldn't open draft: ${err.message}`);
    }
  }, [openWindow, patchWindow, notify]);

  // Closing keeps the draft (after a final save).
  const closeWindow = useCallback(async (key) => {
    cancelTimer(key);
    await save(key);
    removeWindow(key);
  }, [save]);

  // The trash icon deletes the draft too.
  const discardWindow = useCallback(async (key) => {
    await settle(key);
    const w = getWindow(key);
    removeWindow(key);
    if (w?.draftId) {
      try {
        await api(`/drafts/${w.draftId}`, { method: 'DELETE' });
      } catch {
        /* already gone */
      }
      refreshLists();
    }
  }, [refreshLists]);

  // ---- sending, delayed so it can be undone
  const executeSend = useCallback((id) => {
    const p = pending.current.get(id);
    if (!p) return Promise.resolve(null);
    if (p.promise) return p.promise;
    clearTimeout(p.timer);
    const snap = p.snapshot;
    p.promise = api('/mail/send', { method: 'POST', body: { ...payloadOf(snap), draftId: snap.draftId ?? undefined } })
      .then((res) => {
        pending.current.delete(id);
        patchToast(id, { kind: 'sent', threadId: res.thread_id });
        setTimeout(() => dismissToast(id), 5000);
        refreshLists();
        qc.invalidateQueries({ queryKey: ['thread'] });
        return res;
      })
      .catch((err) => {
        pending.current.delete(id);
        patchToast(id, { kind: 'failed', text: `Couldn't send message: ${err.message}` });
        return null;
      });
    return p.promise;
  }, [patchToast, dismissToast, refreshLists, qc]);

  const sendWindow = useCallback(async (key) => {
    const w = getWindow(key);
    if (!w) return;
    if (w.to.length + w.cc.length + w.bcc.length === 0) {
      patchWindow(key, () => ({ error: 'Please specify at least one recipient.', saveState: 'idle' }));
      return;
    }
    if (!w.subject.trim() && !w.body.trim() && !window.confirm('Send this message without a subject or text in the body?')) return;

    await settle(key); // let an in-flight draft save finish so its draft id is known
    const snapshot = getWindow(key);
    removeWindow(key);

    const id = ++toastSeq;
    const timer = setTimeout(() => executeSend(id), UNDO_MS);
    pending.current.set(id, { timer, snapshot });
    setToasts((ts) => [...ts, { id, kind: 'pending', snapshot }]);
  }, [patchWindow, executeSend]);

  const reopen = useCallback((snapshot) => {
    commit((ws) => [...ws, { ...snapshot, key: ++windowSeq, minimized: false, fullscreen: false, error: '', version: 0, dirty: false, saveState: snapshot.draftId ? 'saved' : 'idle' }]);
  }, [commit]);

  const undoSend = useCallback((id) => {
    const p = pending.current.get(id);
    if (!p || p.promise) return;
    clearTimeout(p.timer);
    pending.current.delete(id);
    dismissToast(id);
    reopen(p.snapshot);
  }, [dismissToast, reopen]);

  const reopenFailed = useCallback((toast) => {
    dismissToast(toast.id);
    if (toast.snapshot) reopen(toast.snapshot);
  }, [dismissToast, reopen]);

  const viewSent = useCallback(async (toast) => {
    const res = toast.kind === 'pending' ? await executeSend(toast.id) : { thread_id: toast.threadId };
    if (res?.thread_id) navigate(`/mail/sent/${res.thread_id}`);
  }, [executeSend, navigate]);

  // Closing the tab must neither lose queued mail nor unsaved edits.
  useEffect(() => {
    const flush = () => {
      const post = (path, method, body) =>
        fetch(`/api${path}`, { method, keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      for (const p of pending.current.values()) {
        if (!p.promise) post('/mail/send', 'POST', { ...payloadOf(p.snapshot), draftId: p.snapshot.draftId ?? undefined });
      }
      for (const w of ref.current) {
        if (w.dirty && (w.draftId || hasContent(w))) post(w.draftId ? `/drafts/${w.draftId}` : '/drafts', w.draftId ? 'PUT' : 'POST', payloadOf(w));
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const value = useMemo(
    () => ({
      windows, toasts,
      openCompose, openDraft, update, setLayout, closeWindow, discardWindow, sendWindow,
      undoSend, viewSent, reopenFailed, dismissToast, notify,
    }),
    [windows, toasts, openCompose, openDraft, update, setLayout, closeWindow, discardWindow, sendWindow, undoSend, viewSent, reopenFailed, dismissToast, notify]
  );
  return <ComposeContext.Provider value={value}>{children}</ComposeContext.Provider>;
}

export function useCompose() {
  const ctx = useContext(ComposeContext);
  if (!ctx) throw new Error('useCompose must be used inside <ComposeProvider>');
  return ctx;
}

// Toasts share the compose layer's stack: const { notify } = useToast(); notify('Saved', { undo })
export function useToast() {
  const { notify } = useCompose();
  return { notify };
}
