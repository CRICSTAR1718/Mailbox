import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api.js';
import { useMailbox } from '../../context/MailboxContext.jsx';
import { useMailActions } from '../../hooks/useMailActions.js';
import { useCompose } from '../../context/ComposeContext.jsx';
import { useShortcuts } from '../../context/ShortcutsContext.jsx';
import Toolbar from './Toolbar.jsx';
import CategoryTabs, { CATEGORIES } from './CategoryTabs.jsx';
import MailRow from './MailRow.jsx';
import EmptyState from './EmptyState.jsx';
import { ListSkeleton } from '../ui/Skeletons.jsx';

const LIMIT = 50;

// What to ask the API for, given the route.
function queryParamsFor(view, category) {
  if (view.kind === 'search') return { q: view.q };
  if (view.kind === 'label') return { label: view.labelId };
  if (view.folder === 'starred') return { starred: 1 };
  if (view.folder === 'inbox') return { folder: 'inbox', category };
  return { folder: view.folder };
}

// `stacked`: narrow two-line rows; `openId`: the conversation open in the reading pane, if any
export default function MailList({ view, stacked = false, openId = null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { labels, openCreateLabel } = useMailbox();
  const { toggleFlag, bulk } = useMailActions();
  const { openDraft } = useCompose();
  const [selected, setSelected] = useState(() => new Set());
  const [cursor, setCursor] = useState(null); // thread_id of the keyboard-focused row (j / k)

  const isInbox = view.kind === 'folder' && view.folder === 'inbox';
  const folder = view.kind === 'folder' ? view.folder : null;
  const catParam = searchParams.get('category');
  const category = isInbox ? (CATEGORIES.some((c) => c.key === catParam) ? catParam : 'primary') : undefined;
  const page = Math.max(1, Number.parseInt(searchParams.get('page'), 10) || 1);

  const apiParams = { ...queryParamsFor(view, category), page, limit: LIMIT };
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['mail', apiParams],
    queryFn: () => api(`/mail?${new URLSearchParams(apiParams)}`),
    placeholderData: keepPreviousData,
    enabled: folder !== 'snoozed', // the API has no snooze data yet
  });

  const threads = useMemo(() => data?.threads ?? [], [data]);
  const total = data?.total ?? 0;

  // a new list (folder, tab, page, search) starts with nothing selected
  const listKey = JSON.stringify(apiParams);
  useEffect(() => {
    setSelected(new Set());
    setCursor(null);
  }, [listKey]);
  useEffect(() => {
    if (cursor != null) document.querySelector(`[data-thread-id="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const selectedRows = threads.filter((t) => selected.has(t.thread_id));
  const allState = selectedRows.length === 0 ? 'none' : selectedRows.length === threads.length ? 'all' : 'some';

  const setParam = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) (v == null ? next.delete(k) : next.set(k, v));
    setSearchParams(next);
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const selectWhere = (pred) => setSelected(new Set(threads.filter(pred).map((t) => t.thread_id)));
  const onSelectKind = (kind) => {
    if (kind === 'All') selectWhere(() => true);
    else if (kind === 'None') setSelected(new Set());
    else if (kind === 'Read') selectWhere((t) => t.is_read);
    else if (kind === 'Unread') selectWhere((t) => !t.is_read);
    else if (kind === 'Starred') selectWhere((t) => t.is_starred);
  };

  const runOn = (rows, action, extra = {}) => {
    if (!rows.length) return;
    if (action === 'delete' && !window.confirm(`Delete ${rows.length === 1 ? 'this conversation' : `${rows.length} conversations`} forever? This can't be undone.`)) return;
    bulk.mutate({ threadIds: rows.map((r) => r.thread_id), action, ...extra });
    // rows that leave the list are deselected; labelling / marking read keeps the selection
    if (['archive', 'trash', 'spam', 'move', 'delete'].includes(action)) setSelected(new Set());
  };

  // drafts reopen in the compose window instead of the reading view
  const openThread = (row) =>
    row.folder === 'drafts' ? openDraft(row) : navigate(view.kind === 'label' ? `/label/${view.labelId}/${row.thread_id}` : `/mail/${view.kind === 'search' ? row.folder : view.folder}/${row.thread_id}`);

  const onFlag = (row, field) =>
    toggleFlag.mutate({ itemId: row.item_id, threadId: row.thread_id, field, value: !row[field] });

  // ---- keyboard shortcuts: act on the selection, or on the row under the cursor
  const cursorIndex = threads.findIndex((t) => t.thread_id === cursor);
  const cursorRow = cursorIndex >= 0 ? threads[cursorIndex] : null;
  const targets = () => (selectedRows.length ? selectedRows : cursorRow ? [cursorRow] : []);
  const step = (delta) => {
    if (!threads.length) return;
    const from = cursorIndex < 0 ? (delta > 0 ? -1 : threads.length) : cursorIndex;
    setCursor(threads[Math.min(threads.length - 1, Math.max(0, from + delta))].thread_id);
  };
  // when the cursor row leaves the list, the cursor moves to its neighbour
  const moveOn = (rows, action) => {
    if (cursorRow && rows.includes(cursorRow)) setCursor((threads[cursorIndex + 1] ?? threads[cursorIndex - 1])?.thread_id ?? null);
    runOn(rows, action);
  };
  useShortcuts({
    next: () => step(1),
    prev: () => step(-1),
    open: () => cursorRow && openThread(cursorRow),
    select: () => cursorRow && toggleOne(cursorRow.thread_id),
    archive: () => folder !== 'archive' && moveOn(targets(), 'archive'),
    trash: () => moveOn(targets(), folder === 'trash' ? 'delete' : 'trash'),
    star: () => {
      const rows = targets();
      if (rows.length === 1) onFlag(rows[0], 'is_starred');
      else runOn(rows, rows.every((r) => r.is_starred) ? 'unstar' : 'star');
    },
    read: () => runOn(targets(), 'read'),
    unread: () => runOn(targets(), 'unread'),
  });

  const showEmpty = !isPending && threads.length === 0 && !isError;

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        folder={folder}
        selectedRows={selectedRows}
        allState={allState}
        labels={labels}
        refreshing={isFetching}
        onToggleAll={() => (allState === 'none' ? onSelectKind('All') : setSelected(new Set()))}
        onSelectKind={onSelectKind}
        onRefresh={() => {
          refetch();
          qc.invalidateQueries({ queryKey: ['counts'] });
        }}
        onAction={(action, extra) => runOn(selectedRows, action, extra)}
        onCreateLabel={(rows) => openCreateLabel((label) => runOn(rows, 'label', { label }))}
        onMarkAllRead={() => {
          const unread = threads.filter((t) => !t.is_read);
          if (unread.length) runOn(unread, 'read');
        }}
        page={page}
        limit={LIMIT}
        shown={threads.length}
        total={total}
        onPage={(p) => setParam({ page: p === 1 ? null : p })}
      />
      {isInbox && <CategoryTabs compact={stacked} active={category} onChange={(c) => setParam({ category: c === 'primary' ? null : c, page: null })} />}

      <div className="slim-scroll min-h-0 flex-1 overflow-y-auto">
        {isError && (
          <div className="p-8 text-center text-sm text-muted">
            Couldn’t load your mail.{' '}
            <button type="button" onClick={() => refetch()} className="cursor-pointer border-0 bg-transparent text-link underline">
              Try again
            </button>
          </div>
        )}
        {isPending && !isError && folder !== 'snoozed' && <ListSkeleton stacked={stacked} />}
        {(showEmpty || folder === 'snoozed') && <EmptyState view={view} category={category} />}
        {threads.map((row) => (
          <MailRow
            key={row.thread_id}
            row={row}
            folder={folder}
            selected={selected.has(row.thread_id)}
            focused={row.thread_id === cursor}
            active={row.thread_id === openId}
            stacked={stacked}
            onSelect={toggleOne}
            onOpen={openThread}
            onFlag={onFlag}
            onRowAction={(r, action) => runOn([r], action)}
          />
        ))}
      </div>
    </div>
  );
}
