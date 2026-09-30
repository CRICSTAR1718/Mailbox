import { Archive, Clock, File, Inbox, OctagonAlert, Search, Send, Star, Tag, Trash2 } from 'lucide-react';

const FOLDER_EMPTY = {
  inbox: [Inbox, 'Your inbox is empty', 'New mail will show up here.'],
  starred: [Star, 'No starred messages', 'Stars let you give messages a special status to make them easier to find. To star a message, click the star outline beside any message or conversation.'],
  snoozed: [Clock, 'No snoozed conversations', 'Snooze messages until you are ready to deal with them and they will come back to your inbox.'],
  sent: [Send, 'No sent messages', 'Messages you send will show up here.'],
  drafts: [File, "You don't have any saved drafts", "Saving a draft allows you to keep a message you aren't ready to send yet."],
  spam: [OctagonAlert, 'Hooray, no spam here!', 'Messages that look suspicious are moved here.'],
  trash: [Trash2, 'No conversations in the Trash', 'Deleted conversations show up here for 30 days.'],
  archive: [Archive, 'No archived conversations', 'Archive conversations to keep your inbox tidy without deleting them.'],
};
const CATEGORY_EMPTY = {
  primary: 'Your Primary tab is empty',
  promotions: 'Your Promotions tab is empty',
  social: 'Your Social tab is empty',
  updates: 'Your Updates tab is empty',
};

export default function EmptyState({ view, category }) {
  let Icon, title, hint;
  if (view.kind === 'search') {
    [Icon, title, hint] = [Search, 'No messages matched your search', 'Try different keywords, or search for a sender name instead.'];
  } else if (view.kind === 'label') {
    [Icon, title, hint] = [Tag, 'No conversations with this label', 'Apply this label to a conversation to see it here.'];
  } else {
    [Icon, title, hint] = FOLDER_EMPTY[view.folder];
    if (view.folder === 'inbox' && category) title = CATEGORY_EMPTY[category];
  }
  return (
    <div className="flex flex-col items-center px-8 pt-24 text-center">
      <div className="grid size-24 place-items-center rounded-full bg-tint text-muted">
        <Icon size={44} strokeWidth={1.5} />
      </div>
      <h2 className="mt-6 mb-2 text-[22px] font-normal text-ink">{title}</h2>
      <p className="m-0 max-w-md text-sm text-muted">{hint}</p>
    </div>
  );
}
