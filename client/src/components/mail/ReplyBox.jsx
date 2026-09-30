import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Forward, Reply, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { formatFull } from '../../format.js';
import { ME } from '../../currentUser.js';
import { stripQuote } from './MessageCard.jsx';

const quote = (text) =>
  stripQuote(text).split('\n').filter((l) => l.trim()).slice(0, 8).map((l) => `> ${l}`).join('\n');

// Recipients for a reply: the sender, or the original recipients if I sent the message.
const replyTargets = (m) => (m.from.id === ME.id ? m.to : [m.from]).map((u) => u.email);

export function initialDraft(mode, m, subject) {
  if (mode === 'forward') {
    const header = [
      '---------- Forwarded message ---------',
      `From: ${m.from.name} <${m.from.email}>`,
      `Date: ${formatFull(m.sent_at)}`,
      `Subject: ${subject}`,
      `To: ${m.to.map((u) => u.email).join(', ')}`,
    ].join('\n');
    return { to: '', body: `\n\n${header}\n\n${stripQuote(m.body_text)}` };
  }
  return { to: replyTargets(m).join(', '), body: '' };
}

// Inline reply/forward composer shown under the thread.
export default function ReplyBox({ mode, message, subject, threadId, onClose, onSent }) {
  const initial = initialDraft(mode, message, subject);
  const [to, setTo] = useState(initial.to);
  const [body, setBody] = useState(initial.body);
  const textRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    boxRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const el = textRef.current;
    el?.focus();
    el?.setSelectionRange(0, 0);
  }, []);

  const send = useMutation({
    mutationFn: () => {
      const isForward = mode === 'forward';
      const text = isForward
        ? body
        : `${body.trimEnd()}\n\nOn ${formatFull(message.sent_at)}, ${message.from.name} wrote:\n${quote(message.body_text)}`;
      return api('/mail/send', {
        method: 'POST',
        body: {
          to,
          subject: isForward ? `Fwd: ${subject.replace(/^(fwd?|re):\s*/i, '')}` : `Re: ${subject.replace(/^re:\s*/i, '')}`,
          body: text,
          // replies stay in this conversation; a forward starts a new one
          ...(isForward ? {} : { threadId }),
        },
      });
    },
    onSuccess: () => onSent(mode),
    meta: { silent: true }, // the error is shown inline below
  });

  const canSend = to.trim() && (mode === 'forward' || body.trim()) && !send.isPending;
  const Icon = mode === 'forward' ? Forward : Reply;

  return (
    <div ref={boxRef} className="mt-4 rounded-lg border border-edge shadow-[0_1px_2px_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm">
        <Icon size={18} className="shrink-0 text-icon" />
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-muted">To</span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To"
            placeholder="Recipients (comma separated)"
            className="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm outline-none"
          />
        </label>
      </div>
      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Message body"
        rows={8}
        className="block w-full resize-y border-0 bg-transparent px-4 py-3 font-[inherit] text-sm outline-none"
      />
      {send.error && <p className="m-0 px-4 pb-2 text-xs text-danger">{send.error.message}</p>}
      <div className="flex items-center px-4 pb-3">
        <button
          type="button"
          disabled={!canSend}
          onClick={() => send.mutate()}
          className="h-9 cursor-pointer rounded-full border-0 bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover hover:shadow disabled:cursor-default disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-none"
        >
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          title="Discard draft"
          aria-label="Discard draft"
          onClick={onClose}
          className="ml-auto grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
