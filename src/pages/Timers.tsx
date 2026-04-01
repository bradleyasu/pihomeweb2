/**
 * Timers page.
 *
 * Create new timers and view all active timers with
 * live countdown progress rings.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  TextInput,
  NumberInput,
  Button,
  Card,
  Box,
  Accordion,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHourglass, IconPlus } from '@tabler/icons-react';
import { usePiHome } from '../providers/PiHomeProvider.tsx';
import { TimerCard } from '../components/Timer/TimerCard.tsx';
import { EventPicker } from '../components/Event/EventPicker.tsx';
import { parseDefinition } from '../components/Event/EventBuilder.tsx';
import { useCreateTimer, useEventIntrospection } from '../api/queries.ts';
import { TimersLoader } from '../components/Loading/PageLoader.tsx';
import type { EventDef } from '../types/index.ts';

export function Timers() {
  const { status } = usePiHome();
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState<number | string>(5);
  const [onComplete, setOnComplete] = useState<Record<string, unknown> | null>(null);

  const createTimer = useCreateTimer();

  // Fetch event definitions for the EventPicker
  const introspect = useEventIntrospection();
  useEffect(() => {
    if (!introspect.data) introspect.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventDefs: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  const handleCreate = () => {
    const timerLabel = label.trim() || 'Timer';
    const duration = typeof minutes === 'number' ? minutes * 60 : 300;

    if (duration <= 0) {
      notifications.show({ title: 'Invalid', message: 'Duration must be positive', color: 'red' });
      return;
    }

    // Clean the event payload — strip empty/null values
    let cleanedEvent: Record<string, unknown> | undefined;
    if (onComplete?.type) {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(onComplete)) {
        if (v === '' || v === null || v === undefined) continue;
        if (Array.isArray(v) && v.length === 0) continue;
        if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
        cleaned[k] = v;
      }
      if (cleaned.type) cleanedEvent = cleaned;
    }

    createTimer.mutate(
      { label: timerLabel, duration, on_complete: cleanedEvent },
      {
        onSuccess: () => {
          notifications.show({ title: 'Timer started', message: timerLabel, color: 'green' });
          setLabel('');
          setMinutes(5);
          setOnComplete(null);
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

          {/* On Complete event hook */}
          <Accordion
            variant="separated"
            radius="md"
            styles={{
              item: {
                background: 'var(--ph-surface)',
                border: '1px solid var(--ph-border)',
              },
              control: { padding: '8px 12px' },
              content: { padding: '0 12px 12px' },
            }}
          >
            <Accordion.Item value="on-complete">
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={500}>On Complete</Text>
                  <>
                    {
                    onComplete?.type && (
                      <Badge size="xs" color="rose" variant="filled">
                        set
                      </Badge>
                    )}
                  </>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Attach an event that fires when this timer completes.
                  </Text>
                  <EventPicker
                    value={onComplete}
                    onChange={setOnComplete}
                    definitions={eventDefs}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
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
