/**
 * Home screen "Events" section.
 *
 * Renders saved events that the user flagged "Show on Home" as simple
 * execute-only buttons (no editing controls) — quick shortcuts to fire a
 * favorite event manually. Styled to match the AppLauncher grid.
 */
import { SimpleGrid, Card, Text, Stack } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useFireEvent, type FavoriteRecord } from '../../api/queries.ts';
import type { EventPayload } from '../../types/status.ts';

interface Props {
  events: FavoriteRecord[];
}

export function HomeEvents({ events }: Props) {
  const fireEvent = useFireEvent();

  const handleFire = (fav: FavoriteRecord) => {
    fireEvent.mutate(fav.event as EventPayload, {
      onSuccess: () =>
        notifications.show({ title: 'Event fired', message: fav.name, color: 'green' }),
      onError: () =>
        notifications.show({ title: 'Failed', message: `Could not run "${fav.name}"`, color: 'red' }),
    });
  };

  return (
    <SimpleGrid cols={3} spacing="xs">
      {events.map((fav) => (
        <Card
          key={fav.name}
          p="xs"
          onClick={() => handleFire(fav)}
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            border: '1px solid var(--ph-border)',
            background: 'var(--ph-surface)',
            transition: 'all 0.15s ease',
          }}
        >
          <Stack gap={4} align="center">
            <IconBolt size={28} stroke={1.5} color="var(--ph-accent)" />
            <Text size="xs" lineClamp={1}>
              {fav.name}
            </Text>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
