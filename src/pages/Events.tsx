/**
 * Events page.
 *
 * Three-tab view:
 *   - Sandbox: introspection-driven event builder for building, testing, and saving events
 *   - Saved: manage, edit, test, and delete favorite events
 *   - AirPlay: manage AirPlay react listeners
 */
import { useState } from 'react';
import { Stack, Group, Text, SegmentedControl } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { EventBuilder } from '../components/Event/EventBuilder.tsx';
import { FavoriteEvents } from '../components/Event/FavoriteEvents.tsx';
import { AirPlayListeners } from '../components/Event/AirPlayListeners.tsx';

type Tab = 'sandbox' | 'saved' | 'airplay';

export function Events() {
  const [tab, setTab] = useState<Tab>('sandbox');

  return (
    <Stack gap="md">
      {/* Header */}
      <Group gap="xs">
        <IconBolt size={22} color="var(--ph-accent)" />
        <Text fw={600} size="lg" style={{ fontFamily: '"Outfit", sans-serif' }}>
          Events
        </Text>
      </Group>

      <SegmentedControl
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        data={[
          { value: 'sandbox', label: 'Sandbox' },
          { value: 'saved', label: 'Saved' },
          { value: 'airplay', label: 'AirPlay' },
        ]}
        size="xs"
        fullWidth
        styles={{
          root: { background: 'var(--ph-surface)' },
        }}
      />

      {tab === 'sandbox' && (
        <>
          <Text size="sm" c="dimmed">
            Select an event type to configure and fire. Events are sent directly to PiHome
            and can control screens, timers, tasks, Home Assistant, and more.
          </Text>
          <EventBuilder />
        </>
      )}
      {tab === 'saved' && <FavoriteEvents />}
      {tab === 'airplay' && <AirPlayListeners />}
    </Stack>
  );
}
