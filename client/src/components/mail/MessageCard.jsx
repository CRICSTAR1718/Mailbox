import { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, Ellipsis, Forward, Paperclip, Reply, Star } from 'lucide-react';
import Menu, { MenuItem } from '../ui/Menu.jsx';
import AttachmentCard from './AttachmentCard.jsx';
import { formatDate, formatFull } from '../../format.js';
import { ME } from '../../currentUser.js';

// Links open in a new tab and never get access to this window.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export const sanitize = (html) =>
  DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe'],
    FORBID_ATTR: ['style'],
  });

// text without the quoted history that replies append
export const stripQuote = (text) => text.replace(/\n\s*On .+ wrote:[\s\S]*$/, '').trim();
const oneLine = (text) => stripQuote(text).replace(/\s+/g, ' ').slice(0, 140);

const nameOf = (u) => (u.id === ME.id ? 'me' : u.name);
function recipientSummary(m) {
  const names = [...m.to, ...m.cc].map(nameOf);
  if (names.length === 0) return 'to nobody';
  return `to ${names.length > 3 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')}`;
}

function Avatar({ user, size = 40 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-medium text-white"
      style={{ background: user.avatar_color, width: size, height: size, fontSize: size * 0.42 }}
    >
      {user.name[0]}
    </span>
  );
}

function Details({ m }) {
  const rows = [
    ['from', `${m.from.name} <${m.from.email}>`],
    ['to', m.to.map((u) => `${u.name} <${u.email}>`).join(', ')],
    m.cc.length ? ['cc', m.cc.map((u) => `${u.name} <${u.email}>`).join(', ')] : null,
    m.bcc.length ? ['bcc', m.bcc.map((u) => `${u.name} <${u.email}>`).join(', ')] : null,
    ['date', formatFull(m.sent_at)],
  ].filter(Boolean);
  return (
    <dl className="m-0 grid max-w-[420px] grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-1 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-right text-muted">{k}:</dt>
          <dd className="m-0 break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function MessageCard({ message: m, expanded, narrow = false, onToggle, onStar, onReply, onForward }) {
  const [showQuotes, setShowQuotes] = useState(false);
  const html = useMemo(() => sanitize(m.body_html || ''), [m.body_html]);
  const hasQuote = html.includes('<blockquote');
  const stop = (e) => e.stopPropagation();

  if (!expanded) {
    return (
      <div className="border-b border-line">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded="false"
          className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent px-4 py-3 text-left text-sm hover:bg-tint"
        >
          <Avatar user={m.from} size={40} />
          <span className={`shrink-0 truncate font-bold text-ink ${narrow ? 'w-24' : 'w-[168px]'}`}>{nameOf(m.from)}</span>
          <span className="min-w-0 flex-1 truncate text-muted">{oneLine(m.body_text)}</span>
          {m.attachments.length > 0 && <Paperclip size={14} className="shrink-0 text-icon" />}
          <span className="shrink-0 text-xs text-muted">{formatDate(m.sent_at)}</span>
        </button>
      </div>
    );
  }

  return (
    <article className="border-b border-line px-4 pt-4 pb-6">
      <header onClick={onToggle} aria-expanded="true" className="flex cursor-pointer items-start gap-4">
        <Avatar user={m.from} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <b className="text-ink">{m.from.name}</b>
            <span className="text-xs text-muted">&lt;{m.from.email}&gt;</span>
          </div>
          <div onClick={stop} className="w-fit">
            <Menu
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Show details"
                  className="flex cursor-pointer items-center gap-0.5 border-0 bg-transparent p-0 text-xs text-muted hover:text-ink"
                >
                  {recipientSummary(m)} <ChevronDown size={14} />
                </button>
              )}
            >
              {() => <Details m={m} />}
            </Menu>
          </div>
        </div>
        <div onClick={stop} className="flex shrink-0 items-center gap-0.5 text-xs text-muted">
          <time className="mr-2 whitespace-nowrap">{narrow ? formatDate(m.sent_at) : formatFull(m.sent_at)}</time>
          <button
            type="button"
            title={m.is_starred ? 'Starred' : 'Not starred'}
            aria-label={m.is_starred ? 'Remove star' : 'Add star'}
            aria-pressed={m.is_starred}
            onClick={() => onStar(m)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent hover:bg-btn-hover"
          >
            <Star size={20} strokeWidth={1.75} color={m.is_starred ? '#f4b400' : '#5f6368'} fill={m.is_starred ? '#f4b400' : 'none'} />
          </button>
          <button
            type="button"
            title="Reply"
            aria-label="Reply to this message"
            onClick={() => onReply(m)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
          >
            <Reply size={20} />
          </button>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button
                type="button"
                title="More"
                aria-label="More message actions"
                onClick={toggle}
                className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
              >
                <Ellipsis size={20} />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <MenuItem icon={Reply} onClick={() => { onReply(m); close(); }}>Reply</MenuItem>
                <MenuItem icon={Forward} onClick={() => { onForward(m); close(); }}>Forward</MenuItem>
              </>
            )}
          </Menu>
        </div>
      </header>

      <div className={`pt-4 ${narrow ? '' : 'pl-14'}`}>
        {html ? (
          <div
            className={`mail-body text-ink ${showQuotes ? '' : 'quotes-hidden'}`}
            // sanitized above with DOMPurify
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="mail-body whitespace-pre-wrap text-ink">{m.body_text}</div>
        )}
        {hasQuote && (
          <button
            type="button"
            title={showQuotes ? 'Hide quoted text' : 'Show trimmed content'}
            aria-label={showQuotes ? 'Hide quoted text' : 'Show trimmed content'}
            onClick={() => setShowQuotes((s) => !s)}
            className="mt-1 grid h-4 w-6 cursor-pointer place-items-center rounded-full border-0 bg-tint-strong text-icon hover:bg-edge"
          >
            <Ellipsis size={12} />
          </button>
        )}
        {m.attachments.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-xs text-muted">
              {m.attachments.length} attachment{m.attachments.length > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-3">
              {m.attachments.map((a) => (
                <AttachmentCard key={a.id} attachment={a} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
