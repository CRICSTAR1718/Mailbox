import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext.jsx';

const GROUPS = [
  {
    key: 'density',
    title: 'Density',
    options: [
      ['default', 'Default', 'Rows 40px tall'],
      ['comfortable', 'Comfortable', 'Rows 48px tall'],
      ['compact', 'Compact', 'Rows 32px tall'],
    ],
  },
  {
    key: 'theme',
    title: 'Theme',
    options: [
      ['light', 'Light'],
      ['dark', 'Dark'],
      ['system', 'Same as device'],
    ],
  },
  {
    key: 'readingPane',
    title: 'Reading pane',
    desktopOnly: true,
    options: [
      ['off', 'No split', 'Open conversations full width'],
      ['right', 'Right of inbox', 'List on the left, conversation on the right'],
    ],
  },
];

// Slide-out "Quick settings" panel under the top bar.
export default function SettingsPanel() {
  const settings = useSettings();
  const { settingsOpen: open, closeSettings, update } = settings;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeSettings();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeSettings]);

  return (
    <>
      {open && <div aria-hidden="true" onClick={closeSettings} className="fixed inset-0 z-40 md:hidden bg-black/30" />}
      <aside
        role="dialog"
        aria-label="Quick settings"
        aria-hidden={!open}
        inert={!open}
        className={`fixed top-16 right-0 bottom-0 z-40 flex w-full max-w-[340px] flex-col rounded-tl-2xl bg-popover shadow-[-2px_0_8px_rgba(0,0,0,0.2)] transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex h-14 shrink-0 items-center justify-between pr-2 pl-6">
          <h2 className="m-0 text-base font-medium text-ink">Quick settings</h2>
          <button
            type="button"
            title="Close"
            aria-label="Close settings"
            onClick={closeSettings}
            className="grid size-10 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-icon hover:bg-btn-hover"
          >
            <X size={20} />
          </button>
        </header>
        <div className="slim-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {GROUPS.map((g) => (
            <fieldset key={g.key} className={`m-0 mb-6 min-w-0 border-0 p-0 ${g.desktopOnly ? 'max-md:hidden' : ''}`}>
              <legend className="mb-2 p-0 text-xs font-medium tracking-wide text-muted uppercase">{g.title}</legend>
              {g.options.map(([value, label, hint]) => (
                <label key={value} className="flex cursor-pointer items-start gap-3 rounded py-2 text-sm text-ink hover:bg-hover">
                  <input
                    type="radio"
                    name={g.key}
                    value={value}
                    checked={settings[g.key] === value}
                    onChange={() => update({ [g.key]: value })}
                    className="mt-0.5 size-4 cursor-pointer accent-primary"
                  />
                  <span>
                    {label}
                    {hint && <span className="block text-xs text-muted">{hint}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </aside>
    </>
  );
}
