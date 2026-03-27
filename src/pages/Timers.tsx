/**
 * Timers page.
 *
 * Create new timers and view all active timers with
 * live countdown progress rings.
 */
import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  Button,
  Card,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHourglass, IconPlus } from '@tabler/icons-react';
import { usePiHome } from '../providers/PiHomeProvider.tsx';
import { TimerCard } from '../components/Timer/TimerCard.tsx';
import { useCreateTimer } from '../api/queries.ts';
import { TimersLoader } from '../components/Loading/PageLoader.tsx';

export function Timers() {
  const { status } = usePiHome();
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState<number | string>(5);

  const createTimer = useCreateTimer();

  const handleCreate = () => {
    const timerLabel = label.trim() || 'Timer';
    const duration = typeof minutes === 'number' ? minutes * 60 : 300;

    if (duration <= 0) {
      notifications.show({ title: 'Invalid', message: 'Duration must be positive', color: 'red' });
      return;
    }

    createTimer.mutate(
      { label: timerLabel, duration },
      {
        onSuccess: () => {
          notifications.show({ title: 'Timer started', message: timerLabel, color: 'green' });
          setLabel('');
          setMinutes(5);
        },
        onError: () => {
          notifications.show({ title: 'Failed', message: 'Could not create timer', color: 'red' });
        },
      },
    );
  };

  if (!status) return <TimersLoader />;

  return (
    <Stack gap="md">
      {/* Header */}
      <Group gap="xs">
        <IconHourglass size={22} color="var(--ph-accent)" />
        <Text fw={600} size="lg" style={{ fontFamily: '"Outfit", sans-serif' }}>
          Timers
        </Text>
      </Group>

      {/* Create new timer */}
      <Card p="md">
        <Stack gap="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
            New Timer
          </Text>
          <TextInput
            placeholder="Timer label"
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
          />
          <Group gap="sm" align="flex-end">
            <NumberInput
              label="Duration (minutes)"
              value={minutes}
              onChange={setMinutes}
              min={1}
              max={1440}
              style={{ flex: 1 }}
            />
            <Button
              color="rose"
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
              loading={createTimer.isPending}
            >
              Start
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Active timers */}
      {status.timers.length === 0 ? (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="sm">No active timers</Text>
        </Card>
      ) : (
        <Stack gap="xs">
          {status.timers.map((timer, i) => (
            <TimerCard key={`${timer.label}-${i}`} timer={timer} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
