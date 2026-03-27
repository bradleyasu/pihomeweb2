/**
 * Events page.
 *
 * Provides the introspection-driven event builder
 * for firing arbitrary PiHome events.
 */
import { Stack, Group, Text } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { EventBuilder } from '../components/Event/EventBuilder.tsx';

export function Events() {
  return (
    <Stack gap="md">
      {/* Header */}
      <Group gap="xs">
        <IconBolt size={22} color="var(--ph-accent)" />
        <Text fw={600} size="lg" style={{ fontFamily: '"Outfit", sans-serif' }}>
          Events
        </Text>
      </Group>

      <Text size="sm" c="dimmed">
        Select an event type to configure and fire. Events are sent directly to PiHome
        and can control screens, timers, tasks, Home Assistant, and more.
      </Text>

      <EventBuilder />
    </Stack>
  );
}
