import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mailbox.settings';
const OPTIONS = {
  density: ['default', 'comfortable', 'compact'],
  theme: ['light', 'dark', 'system'],
  readingPane: ['off', 'right'],
};
const DEFAULTS = { density: 'default', theme: 'light', readingPane: 'off' };

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    // ignore anything that isn't a known option
    return Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, OPTIONS[k].includes(saved[k]) ? saved[k] : d]));
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext(null);

// Density, theme and reading pane, persisted in localStorage, plus the open state of the settings panel.
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);
  const [open, setOpen] = useState(false);

  const update = useCallback((patch) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: the choice just won't persist */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = settings.density;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && mq.matches));
    apply();
    if (settings.theme !== 'system') return undefined;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.density, settings.theme]);

  const value = useMemo(
    () => ({
      ...settings,
      update,
      settingsOpen: open,
      openSettings: () => setOpen(true),
      closeSettings: () => setOpen(false),
      toggleSettings: () => setOpen((o) => !o),
    }),
    [settings, update, open]
  );
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
