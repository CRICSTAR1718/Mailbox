import { Check, Minus } from 'lucide-react';

// Gmail-style square checkbox. `mixed` shows the dash used by select-all when some rows are selected.
export default function Checkbox({ checked, mixed = false, onChange, label }) {
  const on = checked || mixed;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent hover:bg-btn-hover"
    >
      <span
        className={`grid size-[18px] place-items-center rounded-[2px] border-2 ${
          on ? 'border-primary bg-primary text-on-primary' : 'border-icon text-transparent'
        } ${mixed ? 'border-icon bg-icon' : ''}`}
      >
        {mixed ? <Minus size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={3} />}
      </span>
    </button>
  );
}
