/**
 * Task row item.
 *
 * Compact, single-line-primary design with inline metadata.
 * Priority is shown as a left-edge color strip. Actions are
 * contextual: confirm/reject for active tasks, delete for others.
 */
import { useState } from 'react';
import { Group, Text, Badge, ActionIcon, Box, Popover, Button, Stack } from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconTrash,
  IconClock,
  IconRepeat,
  IconBolt,
} from '@tabler/icons-react';
import type { TaskStatus } from '../../types/index.ts';

interface Props {
  task: TaskStatus;
  onAck?: (confirm: boolean) => void;
  onDelete?: (id: string) => void;
}

/** Priority color palette for accent theming */
const priorityAccent: Record<string, { color: string; bg: string; border: string }> = {
  LOW: { color: 'var(--ph-blue)', bg: 'rgba(74, 144, 226, 0.06)', border: 'rgba(74, 144, 226, 0.18)' },
  MEDIUM: { color: '#f0a030', bg: 'rgba(240, 160, 48, 0.06)', border: 'rgba(240, 160, 48, 0.18)' },
  HIGH: { color: 'var(--ph-red)', bg: 'rgba(255, 107, 107, 0.08)', border: 'rgba(255, 107, 107, 0.2)' },
};

/** Status label + color */
const statusConfig: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gray', label: 'Pending' },
  PRE_IN_PROGRESS: { color: 'yellow', label: 'Starting' },
  IN_PROGRESS: { color: 'green', label: 'Active' },
  COMPLETED: { color: 'teal', label: 'Done' },
  CANCELED: { color: 'red', label: 'Canceled' },
};

export function TaskCard({ task, onAck, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = statusConfig[task.status] ?? statusConfig.PENDING;
  const isActive = task.status === 'IN_PROGRESS';
  const accent = priorityAccent[task.priority] ?? priorityAccent.LOW;
  const hasEvents = !!(task.on_run || task.on_confirm || task.on_cancel);

  return (
    <Box
      py={10}
      px={12}
      style={{
        borderRadius: 12,
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        display: 'flex',
        gap: 10,
        alignItems: 'stretch',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Priority accent strip */}
      <Box
        style={{
          width: 3,
          borderRadius: 3,
          background: accent.color,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      />

      {/* Content */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: name + status badge */}
        <Group gap={6} wrap="nowrap" mb={2}>
          <Text fw={500} size="sm" lineClamp={1} style={{ flex: 1 }}>
            {task.name}
          </Text>
          <Badge size="xs" variant="light" color={status.color} style={{ flexShrink: 0 }}>
            {status.label}
          </Badge>
        </Group>

        {/* Description (if any) */}
        {task.description && (
          <Text size="xs" c="dimmed" lineClamp={1} mb={2}>
            {task.description}
          </Text>
        )}

        {/* Meta row: time, repeat, events indicator */}
        <Group gap={8}>
          {task.start_time && (
            <Group gap={3} wrap="nowrap">
              <IconClock size={11} color="var(--ph-text-dim)" />
              <Text size="10px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {task.start_time}
              </Text>
            </Group>
          )}
          {task.repeat_days && task.repeat_days > 0 && (
            <Group gap={3} wrap="nowrap">
              <IconRepeat size={11} color="var(--ph-text-dim)" />
              <Text size="10px" c="dimmed">
                {task.repeat_days === 1 ? 'Daily' :
                 task.repeat_days === 7 ? 'Weekly' :
                 task.repeat_days === 14 ? 'Bi-weekly' :
                 task.repeat_days === 30 ? 'Monthly' :
                 `${task.repeat_days}d`}
              </Text>
            </Group>
          )}
          {hasEvents && (
            <Group gap={3} wrap="nowrap">
              <IconBolt size={11} color="var(--ph-accent)" />
              <Text size="10px" c="var(--ph-accent)">Events</Text>
            </Group>
          )}
        </Group>
      </Box>

      {/* Actions */}
      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0, alignSelf: 'center' }}>
        {isActive && onAck ? (
          <>
            <ActionIcon
              variant="light"
              color="green"
              size="md"
              radius="xl"
              onClick={() => onAck(true)}
              title="Complete"
            >
              <IconCheck size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              size="md"
              radius="xl"
              onClick={() => onAck(false)}
              title="Reject"
            >
              <IconX size={16} />
            </ActionIcon>
          </>
        ) : onDelete ? (
          <Popover opened={confirmOpen} onChange={setConfirmOpen} position="left" withArrow shadow="md">
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                radius="xl"
                onClick={() => setConfirmOpen(true)}
                title="Delete"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <Stack gap={6}>
                <Text size="xs">Delete this task?</Text>
                <Group gap={6} justify="flex-end">
                  <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="compact-xs" color="red" onClick={() => { setConfirmOpen(false); onDelete(task.id); }}>
                    Delete
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        ) : null}
      </Group>
    </Box>
  );
}
