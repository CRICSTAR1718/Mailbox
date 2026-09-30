import { Info, Inbox, Tag, Users } from 'lucide-react';
import { useMailbox } from '../../context/MailboxContext.jsx';

export const CATEGORIES = [
  { key: 'primary', label: 'Primary', icon: Inbox, color: '#0b57d0' },
  { key: 'promotions', label: 'Promotions', icon: Tag, color: '#188038' },
  { key: 'social', label: 'Social', icon: Users, color: '#d93025' },
  { key: 'updates', label: 'Updates', icon: Info, color: '#e37400' },
];

export default function CategoryTabs({ active, onChange, compact = false }) {
  const { counts } = useMailbox();
  return (
    <div role="tablist" className={`flex h-14 shrink-0 border-b border-line ${compact ? '' : 'pl-2'}`}>
      {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
        const isActive = key === active;
        const unread = counts?.categories?.[key]?.unread ?? 0;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            title={compact ? label : undefined}
            aria-label={compact ? `${label}${unread ? `, ${unread} new` : ''}` : undefined}
            style={isActive ? { color, borderBottomColor: color } : undefined}
            className={`relative -mb-px flex min-w-0 cursor-pointer items-center border-0 border-b-[3px] bg-transparent text-sm font-medium ${
              compact ? 'flex-1 justify-center gap-1 px-1' : 'w-[236px] max-w-[25%] gap-4 px-4'
            } ${
              isActive ? '' : 'border-b-transparent text-muted hover:bg-tint'
            }`}
          >
            <Icon size={20} className="shrink-0" />
            {!compact && <span className="truncate">{label}</span>}
            {!isActive && unread > 0 && (
              <span className={`shrink-0 rounded-[10px] px-2 py-px text-xs text-white ${compact ? '' : 'ml-auto'}`} style={{ background: color }}>
                {compact ? unread : `${unread} new`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
