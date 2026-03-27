/**
 * Task row item.
 *
 * Compact, single-line-primary design with inline metadata.
 * Priority is shown as a left-edge color strip. Actions are
 * contextual: confirm/reject for active tasks, delete for others.
 */
import { Group, Text, Badge, ActionIcon, Box } from '@mantine/core';
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

/** Priority color for the left accent strip */
const priorityColor: Record<number, string> = {
  1: 'var(--ph-blue)',
  2: '#f0a030',
  3: 'var(--ph-red)',
};

/** Status label + color */
const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'gray', label: 'Pending' },
  pre_in_progress: { color: 'yellow', label: 'Starting' },
  in_progress: { color: 'green', label: 'Active' },
  completed: { color: 'teal', label: 'Done' },
  canceled: { color: 'red', label: 'Canceled' },
};

export function TaskCard({ task, onAck, onDelete }: Props) {
  const status = statusConfig[task.status] ?? statusConfig.pending;
  const isActive = task.status === 'in_progress';
  const accent = priorityColor[task.priority] ?? priorityColor[1];
  const hasEvents = !!(task.on_run || task.on_confirm || task.on_cancel);

  return (
    <Box
      py={10}
      px={12}
      style={{
        borderRadius: 12,
        background: isActive
          ? 'rgba(81, 207, 102, 0.06)'
          : 'var(--ph-surface)',
        border: isActive
          ? '1px solid rgba(81, 207, 102, 0.2)'
          : '1px solid var(--ph-border)',
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
          background: accent,
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
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            radius="xl"
            onClick={() => onDelete(task.id)}
            title="Delete"
          >
            <IconTrash size={14} />
          </ActionIcon>
        ) : null}
      </Group>
    </Box>
  );
}
