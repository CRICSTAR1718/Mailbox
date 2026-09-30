import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api } from '../../api.js';
import Modal, { DialogButton } from '../ui/Modal.jsx';

export const LABEL_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#6b7280',
];

// Name + color picker (palette swatches plus a free color input).
export function CreateLabelModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const create = useMutation({
    mutationFn: () => api('/labels', { method: 'POST', body: { name: name.trim(), color } }),
    onSuccess: (label) => onCreated(label),
    meta: { silent: true }, // the error is shown inline in the dialog
  });
  const submit = (e) => {
    e.preventDefault();
    if (name.trim() && !create.isPending) create.mutate();
  };

  return (
    <Modal title="New label" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="mb-1 block text-sm text-muted" htmlFor="label-name">Label name</label>
        <input
          id="label-name"
          autoFocus
          value={name}
          maxLength={50}
          onChange={(e) => {
            setName(e.target.value);
            create.reset();
          }}
          className="h-10 w-full rounded border border-outline px-3 text-sm outline-none focus:border-2 focus:border-primary"
        />
        <div className="mt-5 mb-2 text-sm text-muted">Color</div>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Label color">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className="grid size-7 cursor-pointer place-items-center rounded-full border-0 text-white"
              style={{ background: c }}
            >
              {color === c && <Check size={16} strokeWidth={3} />}
            </button>
          ))}
          <label className="ml-1 flex cursor-pointer items-center gap-2 text-xs text-muted" title="Pick any color">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Custom color" className="size-7 cursor-pointer border-0 bg-transparent p-0" />
            Custom
          </label>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm">
          <span className="text-muted">Preview</span>
          <span className="rounded-[4px] px-2 text-xs leading-5 font-medium text-white" style={{ background: color }}>
            {name.trim() || 'Label'}
          </span>
        </div>
        {create.error && <p role="alert" className="mt-3 mb-0 text-xs text-danger">{create.error.message}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <DialogButton onClick={onClose}>Cancel</DialogButton>
          <DialogButton primary type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </DialogButton>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="m-0 text-sm text-ink">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <DialogButton onClick={onClose}>Cancel</DialogButton>
        <DialogButton primary onClick={onConfirm}>{confirmLabel}</DialogButton>
      </div>
    </Modal>
  );
}
