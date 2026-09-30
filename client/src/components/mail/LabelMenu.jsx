import { Check, Minus, Plus, Tag } from 'lucide-react';
import Menu, { MenuItem } from '../ui/Menu.jsx';
import { ToolButton } from './toolbarParts.jsx';

function Mark({ state }) {
  const on = state !== 'none';
  return (
    <span
      className={`grid size-[18px] shrink-0 place-items-center rounded-[2px] border-2 text-on-primary ${
        on ? (state === 'some' ? 'border-icon bg-icon' : 'border-primary bg-primary') : 'border-icon'
      }`}
    >
      {state === 'all' && <Check size={14} strokeWidth={3} />}
      {state === 'some' && <Minus size={14} strokeWidth={3} />}
    </span>
  );
}

// "Labels" toolbar dropdown: one checkbox per label, reflecting how many of `rows` have it
// (checked = all, dash = some). Clicking applies it to every row, or removes it if all have it.
export default function LabelMenu({ labels, rows, onToggle, onCreate }) {
  return (
    <Menu trigger={({ toggle }) => <ToolButton label="Labels" onClick={toggle}><Tag size={20} /></ToolButton>}>
      {({ close }) => (
        <>
          <div className="px-4 pb-1 text-xs text-muted">Label as:</div>
          {labels.length === 0 && <MenuItem disabled>No labels yet</MenuItem>}
          {labels.map((l) => {
            const n = rows.filter((r) => r.labels.some((x) => x.id === l.id)).length;
            const state = n === 0 ? 'none' : n === rows.length ? 'all' : 'some';
            return (
              <MenuItem key={l.id} onClick={() => onToggle({ id: l.id, name: l.name, color: l.color }, state !== 'all')}>
                <Mark state={state} />
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
                {l.name}
              </MenuItem>
            );
          })}
          <div className="my-1 border-t border-line" />
          <MenuItem icon={Plus} onClick={() => { close(); onCreate(); }}>Create new</MenuItem>
        </>
      )}
    </Menu>
  );
}
