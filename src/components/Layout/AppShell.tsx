/**
 * App shell with bottom tab navigation.
 *
 * Mobile-first layout: scrollable content area + fixed bottom bar.
 * The bottom nav uses a pill-style active indicator with smooth transitions.
 */
import { type ReactNode } from 'react';
import { Box, Group, Stack, Text, UnstyledButton, Indicator } from '@mantine/core';
import {
  IconHome,
  IconChecklist,
  IconHourglass,
  IconBolt,
  IconSettings,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import type { TabId } from '../../App.tsx';
import { usePiHome } from '../../providers/PiHomeProvider.tsx';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

const tabs: { id: TabId; label: string; icon: typeof IconHome }[] = [
  { id: 'home', label: 'Home', icon: IconHome },
  { id: 'tasks', label: 'Tasks', icon: IconChecklist },
  { id: 'timers', label: 'Timers', icon: IconHourglass },
  { id: 'events', label: 'Events', icon: IconBolt },
  { id: 'settings', label: 'Settings', icon: IconSettings },
];

export function AppShell({ activeTab, onTabChange, children }: Props) {
  const { online } = usePiHome();

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Connection status bar — only shown when offline */}
      {!online && (
        <Box
          py={6}
          px="md"
          style={{
            background: 'rgba(255, 107, 107, 0.15)',
            borderBottom: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          <Group gap={6} justify="center">
            <IconWifiOff size={14} color="var(--ph-red)" />
            <Text size="xs" c="var(--ph-red)" fw={500}>
              Disconnected — reconnecting...
            </Text>
          </Group>
        </Box>
      )}

      {/* Scrollable content area */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
        px="md"
        py="md"
      >
        {children}
      </Box>

      {/* Bottom navigation bar */}
      <Box
        style={{
          background: 'var(--ph-bg)',
          borderTop: '1px solid var(--ph-border)',
          paddingTop: 6,
          paddingBottom: 4,
          flexShrink: 0,
        }}
      >
        <Group justify="space-around" px="xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <UnstyledButton
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                py={6}
                px={12}
                style={{
                  borderRadius: 16,
                  background: isActive ? 'var(--ph-accent-dim)' : 'transparent',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  minWidth: 52,
                }}
              >
                <Icon
                  size={22}
                  stroke={isActive ? 2 : 1.5}
                  color={isActive ? 'var(--ph-accent)' : 'var(--ph-text-dim)'}
                  style={{ transition: 'color 0.2s ease' }}
                />
                <Text
                  size="10px"
                  fw={isActive ? 600 : 400}
                  c={isActive ? 'var(--ph-accent)' : 'var(--ph-text-dim)'}
                  style={{ transition: 'color 0.2s ease', lineHeight: 1.2 }}
                >
                  {tab.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Group>
      </Box>
    </Box>
  );
}
