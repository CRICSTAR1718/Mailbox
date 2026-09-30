import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';
import { useToast } from './ComposeContext.jsx';
import { ConfirmModal, CreateLabelModal } from '../components/labels/LabelModal.jsx';

const MailboxContext = createContext(null);
const NO_LABELS = [];

// Shared sidebar data (unread counts, labels) plus the create/delete-label dialogs.
export function MailboxProvider({ children }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { notify } = useToast();
  const counts = useQuery({ queryKey: ['counts'], queryFn: () => api('/counts'), refetchInterval: 60_000 });
  const labels = useQuery({ queryKey: ['labels'], queryFn: () => api('/labels') });

  const [createDialog, setCreateDialog] = useState(null); // { onCreated? }
  const [deleteDialog, setDeleteDialog] = useState(null); // label being deleted

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['counts'] });
    qc.invalidateQueries({ queryKey: ['labels'] });
  }, [qc]);

  // Opens the "New label" modal. `onCreated(label)` lets callers apply the new label right away.
  const openCreateLabel = useCallback((onCreated) => setCreateDialog({ onCreated }), []);
  const requestDeleteLabel = useCallback((label) => setDeleteDialog(label), []);

  const confirmDelete = async () => {
    const label = deleteDialog;
    setDeleteDialog(null);
    try {
      await api(`/labels/${label.id}`, { method: 'DELETE' });
      // the deleted label's own list would 404 if refetched, so drop it instead
      qc.removeQueries({ queryKey: ['mail'], predicate: (q) => String(q.queryKey[1]?.label) === String(label.id) });
      qc.invalidateQueries({ queryKey: ['labels'] });
      qc.invalidateQueries({ queryKey: ['mail'] });
      qc.invalidateQueries({ queryKey: ['thread'] });
      if (pathname.startsWith(`/label/${label.id}`)) navigate('/mail/inbox', { replace: true });
      notify(`Label “${label.name}” deleted.`);
    } catch (err) {
      notify(`Couldn’t delete label: ${err.message}`);
    }
  };

  const value = useMemo(
    () => ({
      counts: counts.data ?? null,
      labels: labels.data?.labels ?? NO_LABELS,
      labelsLoaded: labels.isSuccess,
      error: counts.error?.message ?? labels.error?.message ?? null,
      refresh,
      openCreateLabel,
      requestDeleteLabel,
    }),
    [counts.data, counts.error, labels.data, labels.isSuccess, labels.error, refresh, openCreateLabel, requestDeleteLabel]
  );

  return (
    <MailboxContext.Provider value={value}>
      {children}
      {createDialog && (
        <CreateLabelModal
          onClose={() => setCreateDialog(null)}
          onCreated={(label) => {
            setCreateDialog(null);
            qc.invalidateQueries({ queryKey: ['labels'] });
            notify(`Label “${label.name}” created.`);
            createDialog.onCreated?.(label);
          }}
        />
      )}
      {deleteDialog && (
        <ConfirmModal
          title="Delete label?"
          message={`Delete the label “${deleteDialog.name}”? Conversations that have it will not be deleted.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onClose={() => setDeleteDialog(null)}
        />
      )}
    </MailboxContext.Provider>
  );
}

export function useMailbox() {
  const ctx = useContext(MailboxContext);
  if (!ctx) throw new Error('useMailbox must be used inside <MailboxProvider>');
  return ctx;
}
