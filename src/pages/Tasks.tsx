/**
 * Tasks page.
 *
 * Compact task list with inline filtering, stats in the header,
 * and slim row-based task items.
 */
import { useState, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  SegmentedControl,
  Button,
  Card,
  Badge,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconChecklist } from '@tabler/icons-react';
import { usePiHome } from '../providers/PiHomeProvider.tsx';
import { TaskCard } from '../components/Task/TaskCard.tsx';
import { TaskCreator } from '../components/Task/TaskCreator.tsx';
import { useAckTask, useDeleteTask } from '../api/queries.ts';
import { TasksLoader } from '../components/Loading/PageLoader.tsx';

type FilterValue = 'all' | 'active' | 'pending';

export function Tasks() {
  const { status } = usePiHome();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [creatorOpen, setCreatorOpen] = useState(false);

  const ackTask = useAckTask();
  const deleteTask = useDeleteTask();

  const tasks = status?.tasks ?? [];

  const filtered = useMemo(() => {
    let list: typeof tasks;
    switch (filter) {
      case 'active':
        list = tasks.filter((t) => t.status === 'in_progress' || t.status === 'pre_in_progress');
        break;
      case 'pending':
        list = tasks.filter((t) => t.status === 'pending');
        break;
      default:
        list = [...tasks];
    }
    // Sort by start_time ascending (soonest first), tasks without a date go last
    list.sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0;
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
    return list;
  }, [tasks, filter]);

  const activeCount = tasks.filter((t) => t.status === 'in_progress').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  const handleAck = (confirm: boolean) => {
    ackTask.mutate(confirm, {
      onSuccess: () => {
        notifications.show({
          title: confirm ? 'Task completed' : 'Task rejected',
          message: '',
          color: confirm ? 'green' : 'red',
        });
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteTask.mutate(id, {
      onSuccess: () => {
        notifications.show({ title: 'Task deleted', message: '', color: 'gray' });
      },
    });
  };

  if (!status) return <TasksLoader />;

  return (
    <Stack gap="sm">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconChecklist size={22} color="var(--ph-accent)" />
          <Text fw={600} size="lg" style={{ fontFamily: '"Outfit", sans-serif' }}>
            Tasks
          </Text>
          <Group gap={4} ml={4}>
            {activeCount > 0 && (
              <Badge variant="filled" color="green" size="xs" circle>
                {activeCount}
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="filled" color="gray" size="xs" circle>
                {pendingCount}
              </Badge>
            )}
          </Group>
        </Group>
        <Button
          size="compact-sm"
          color="rose"
          leftSection={<IconPlus size={14} />}
          onClick={() => setCreatorOpen(true)}
        >
          New
        </Button>
      </Group>

      {/* Filter */}
      <SegmentedControl
        value={filter}
        onChange={(v) => setFilter(v as FilterValue)}
        data={[
          { value: 'all', label: `All (${tasks.length})` },
          { value: 'active', label: 'Active' },
          { value: 'pending', label: 'Pending' },
        ]}
        size="xs"
        fullWidth
        styles={{
          root: { background: 'var(--ph-surface)' },
        }}
      />

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card p="lg" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="sm">
            {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
          </Text>
        </Card>
      ) : (
        <Stack gap={6}>
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onAck={handleAck}
              onDelete={handleDelete}
            />
          ))}
        </Stack>
      )}

      <TaskCreator opened={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </Stack>
  );
}
