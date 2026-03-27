/**
 * Root App component.
 *
 * Manages tab-based navigation and renders the active page
 * within a mobile-first shell with bottom navigation.
 */
import { useState, useCallback } from 'react';
import { Box, Transition } from '@mantine/core';
import { AppShell } from './components/Layout/AppShell.tsx';
import { Home } from './pages/Home.tsx';
import { Tasks } from './pages/Tasks.tsx';
import { Timers } from './pages/Timers.tsx';
import { Events } from './pages/Events.tsx';
import { Settings } from './pages/Settings.tsx';

export type TabId = 'home' | 'tasks' | 'timers' | 'events' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const renderPage = useCallback(() => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'tasks': return <Tasks />;
      case 'timers': return <Timers />;
      case 'events': return <Events />;
      case 'settings': return <Settings />;
    }
  }, [activeTab]);

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      <Box className="page-enter" key={activeTab}>
        {renderPage()}
      </Box>
    </AppShell>
  );
}

export default App;
