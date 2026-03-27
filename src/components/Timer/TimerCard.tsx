/**
 * Timer countdown card.
 *
 * Displays a timer with a circular progress ring,
 * label, and time remaining. Pulses when urgent (< 60s).
 */
import { useState, useEffect, useRef } from 'react';
import { Card, Group, Stack, Text, RingProgress, Box } from '@mantine/core';
import { IconHourglass } from '@tabler/icons-react';
import type { TimerStatus } from '../../types/index.ts';

interface Props {
  timer: TimerStatus;
  /** Whether to show in compact mode (for home screen) */
  compact?: boolean;
}

/** Format seconds into HH:MM:SS or MM:SS */
function formatTime(seconds: number): string {
  if (seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TimerCard({ timer, compact = false }: Props) {
  const [localOffset, setLocalOffset] = useState(0);

  // Track when we last received fresh elapsed_time from the server
  // so we can locally increment between status updates for smooth countdown.
  const lastElapsed = useRef(timer.elapsed_time);
  const snapshotTime = useRef(Date.now());

  // Reset snapshot whenever the server sends a new elapsed_time
  useEffect(() => {
    lastElapsed.current = timer.elapsed_time;
    snapshotTime.current = Date.now();
    setLocalOffset(0);
  }, [timer.elapsed_time]);

  // Tick every second to smoothly count between server updates
  useEffect(() => {
    const interval = setInterval(() => {
      const secondsSinceSnapshot = (Date.now() - snapshotTime.current) / 1000;
      setLocalOffset(secondsSinceSnapshot);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Remaining = total duration minus (server elapsed + local offset since last update)
  const effectiveElapsed = lastElapsed.current + localOffset;
  const remaining = Math.max(0, timer.duration - effectiveElapsed);
  const progress = timer.duration > 0
    ? (effectiveElapsed / timer.duration) * 100
    : 100;
  const isUrgent = remaining > 0 && remaining < 60;
  const isDone = remaining <= 0;

  const ringColor = isDone ? 'var(--ph-green)' : isUrgent ? 'var(--ph-red)' : 'var(--ph-accent)';

  if (compact) {
    return (
      <Group gap="xs" wrap="nowrap">
        <RingProgress
          size={32}
          thickness={3}
          roundCaps
          sections={[{ value: Math.min(progress, 100), color: ringColor }]}
        />
        <Stack gap={0}>
          <Text size="xs" fw={500} lineClamp={1}>{timer.label}</Text>
          <Text
            size="xs"
            fw={700}
            c={isUrgent ? 'var(--ph-red)' : isDone ? 'var(--ph-green)' : undefined}
            className={isUrgent ? 'pulse' : undefined}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {isDone ? 'Done!' : formatTime(remaining)}
          </Text>
        </Stack>
      </Group>
    );
  }

  return (
    <Card
      p="md"
      className={isUrgent ? 'pulse' : undefined}
      style={isUrgent ? {
        border: '1px solid rgba(255, 107, 107, 0.3)',
        background: 'rgba(255, 107, 107, 0.05)',
      } : undefined}
    >
      <Group gap="md" wrap="nowrap">
        <RingProgress
          size={64}
          thickness={5}
          roundCaps
          sections={[{ value: Math.min(progress, 100), color: ringColor }]}
          label={
            <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconHourglass size={20} color={ringColor} stroke={1.5} />
            </Box>
          }
        />
        <Stack gap={4} style={{ flex: 1 }}>
          <Text fw={600} size="md">{timer.label}</Text>
          <Text
            fw={700}
            size="xl"
            c={isUrgent ? 'var(--ph-red)' : isDone ? 'var(--ph-green)' : 'var(--ph-accent)'}
            style={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
          >
            {isDone ? 'Complete!' : formatTime(remaining)}
          </Text>
          <Text size="xs" c="dimmed">
            {Math.round(timer.duration / 60)} min total
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
