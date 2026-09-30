import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { MailboxProvider } from './context/MailboxContext.jsx';
import { ComposeProvider } from './context/ComposeContext.jsx';
import { ShortcutsProvider } from './context/ShortcutsContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { useIsDesktop } from './hooks/useMediaQuery.js';
import ComposeLayer from './components/compose/ComposeLayer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import MailPane from './components/MailPane.jsx';

const STORAGE_KEY = 'mailbox.sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function Layout() {
  const isDesktop = useIsDesktop();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false); // phone layout: the sidebar is a slide-in drawer

  // moving to another page closes the drawer
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  const toggleSidebar = () => {
    if (!isDesktop) {
      setDrawerOpen((o) => !o);
      return;
    }
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      } catch {
        /* storage unavailable: the choice just won't persist */
      }
      return !c;
    });
  };

  return (
    <SettingsProvider>
      <ComposeProvider>
        <MailboxProvider>
          <ShortcutsProvider>
            <div className="flex h-full flex-col bg-surface">
              <TopBar onToggleSidebar={toggleSidebar} />
              <div className="flex min-h-0 flex-1">
                {!isDesktop && drawerOpen && (
                  <div aria-hidden="true" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/40" />
                )}
                <Sidebar collapsed={isDesktop && collapsed} drawer={!isDesktop} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
                <main className="min-w-0 flex-1 md:pr-4 md:pb-4">
                  <div className="h-full overflow-hidden bg-panel md:rounded-2xl">
                    <ErrorBoundary resetKey={pathname}>
                      <Outlet />
                    </ErrorBoundary>
                  </div>
                </main>
              </div>
            </div>
            <ErrorBoundary variant="compose">
              <ComposeLayer />
            </ErrorBoundary>
            <SettingsPanel />
          </ShortcutsProvider>
        </MailboxProvider>
      </ComposeProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/mail/inbox" replace />} />
        <Route path="/mail/:folder" element={<MailPane />} />
        <Route path="/mail/:folder/:threadId" element={<MailPane />} />
        <Route path="/label/:labelId" element={<MailPane />} />
        <Route path="/label/:labelId/:threadId" element={<MailPane />} />
        <Route path="/search" element={<MailPane />} />
        <Route path="*" element={<Navigate to="/mail/inbox" replace />} />
      </Route>
    </Routes>
  );
}
