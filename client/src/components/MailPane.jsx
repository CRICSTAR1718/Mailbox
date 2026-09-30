import { Mail } from 'lucide-react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useMailbox } from '../context/MailboxContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useIsDesktop } from '../hooks/useMediaQuery.js';
import MailList from './mail/MailList.jsx';
import ThreadView from './mail/ThreadView.jsx';

export const FOLDER_TITLES = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  sent: 'Sent',
  drafts: 'Drafts',
  spam: 'Spam',
  trash: 'Trash',
  archive: 'Archive',
};

function NothingSelected() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-tint text-muted">
          <Mail size={36} strokeWidth={1.5} />
        </div>
        <p className="m-0 text-sm text-muted">Select a conversation to read</p>
      </div>
    </div>
  );
}

// Resolves the route into a "view" (folder, label or search) and shows its list, an open thread,
// or (reading pane "right", desktop only) the list and the thread side by side.
export default function MailPane() {
  const { folder, labelId, threadId } = useParams();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { labelsLoaded, labels } = useMailbox();
  const { readingPane } = useSettings();
  const isDesktop = useIsDesktop();
  const split = isDesktop && readingPane === 'right';

  let view;
  let backTo;
  if (pathname.startsWith('/search')) {
    const q = params.get('q') ?? '';
    view = { kind: 'search', q };
    backTo = `/search?q=${encodeURIComponent(q)}`;
  } else if (labelId) {
    if (labelsLoaded && !labels.some((l) => String(l.id) === labelId)) return <Navigate to="/mail/inbox" replace />;
    view = { kind: 'label', labelId };
    backTo = `/label/${labelId}`;
  } else {
    if (!(folder in FOLDER_TITLES)) return <Navigate to="/mail/inbox" replace />;
    view = { kind: 'folder', folder };
    backTo = `/mail/${folder}`;
  }

  if (split) {
    return (
      <div className="flex h-full">
        <div className="h-full w-[42%] max-w-[560px] min-w-[380px] shrink-0 border-r border-line">
          <MailList view={view} stacked openId={threadId ? Number(threadId) : null} />
        </div>
        <div className="min-w-0 flex-1">
          {threadId ? <ThreadView key={threadId} threadId={threadId} backTo={backTo} split /> : <NothingSelected />}
        </div>
      </div>
    );
  }

  if (threadId) return <ThreadView key={threadId} threadId={threadId} backTo={backTo} />;
  return <MailList view={view} stacked={!isDesktop} />;
}
