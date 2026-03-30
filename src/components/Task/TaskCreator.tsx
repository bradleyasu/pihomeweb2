/**
 * Task creation modal/form.
 *
 * Allows creating new scheduled tasks with name, description,
 * priority, scheduling options, repeat interval, and optional
 * event hooks (on_run, on_confirm, on_cancel) that fire at
 * different points in the task lifecycle.
 *
 * Uses Mantine DateTimePicker for date/time selection and
 * the reusable EventPicker for event hook configuration.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Switch,
  Button,
  Group,
  Text,
  Accordion,
  Badge,
  ScrollArea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useCreateTask, useEventIntrospection } from '../../api/queries.ts';
import { parseDefinition } from '../Event/EventBuilder.tsx';
import { EventPicker } from '../Event/EventPicker.tsx';
import type { EventDef } from '../../types/index.ts';

interface Props {
  opened: boolean;
  onClose: () => void;
}

/** Format a JS Date into the MM/DD/YYYY HH:MM string the backend expects */
function formatForBackend(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

/** Strip empty/default values from an event payload so we don't send noise */
function cleanEventPayload(event: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!event || !event.type) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(event)) {
    if (v === '' || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    cleaned[k] = v;
  }
  // Must at least have a type
  return cleaned.type ? cleaned : null;
}

export function TaskCreator({ opened, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('2');
  const [isScheduled, setIsScheduled] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [repeatDays, setRepeatDays] = useState<number>(0);
  const [isPassive, setIsPassive] = useState(false);

  // Event hooks
  const [onRun, setOnRun] = useState<Record<string, unknown> | null>(null);
  const [onConfirm, setOnConfirm] = useState<Record<string, unknown> | null>(null);
  const [onCancel, setOnCancel] = useState<Record<string, unknown> | null>(null);

  const createTask = useCreateTask();

  // Fetch event definitions once so all three EventPickers share them
  const introspect = useEventIntrospection();
  useEffect(() => {
    if (opened && !introspect.data) {
      introspect.mutate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const eventDefs: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  // Count how many event hooks are configured
  const eventCount = [onRun, onConfirm, onCancel].filter((e) => e?.type).length;

  const handleSubmit = () => {
    if (!name.trim()) {
      notifications.show({ title: 'Error', message: 'Task name is required', color: 'red' });
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      priority: parseInt(priority),
      is_passive: isPassive,
    };

    if (isScheduled) {
      if (!startDate) {
        notifications.show({ title: 'Error', message: 'Please select a date and time', color: 'red' });
        return;
      }
      payload.start_time = formatForBackend(startDate);
      if (repeatDays > 0) payload.repeat_days = repeatDays;
    } else {
      // Quick task — 5 minutes from now
      payload.start_time = 'delta:5 minutes';
    }

    // Attach event hooks if configured
    const cleanedRun = cleanEventPayload(onRun);
    const cleanedConfirm = cleanEventPayload(onConfirm);
    const cleanedCancel = cleanEventPayload(onCancel);
    if (cleanedRun) payload.on_run = cleanedRun;
    if (cleanedConfirm) payload.on_confirm = cleanedConfirm;
    if (cleanedCancel) payload.on_cancel = cleanedCancel;

    createTask.mutate(payload as Record<string, unknown>, {
      onSuccess: () => {
        notifications.show({ title: 'Task created', message: name, color: 'green' });
        resetForm();
        onClose();
      },
      onError: () => {
        notifications.show({ title: 'Failed', message: 'Could not create task', color: 'red' });
      },
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriority('2');
    setIsScheduled(false);
    setStartDate(null);
    setRepeatDays(0);
    setIsPassive(false);
    setOnRun(null);
    setOnConfirm(null);
    setOnCancel(null);
  };



  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Task"
      centered
      size="lg"
      styles={{
        header: { background: 'var(--ph-surface-solid)', borderBottom: '1px solid var(--ph-border)' },
        body: { background: 'var(--ph-surface-solid)', padding: 0 },
        content: { background: 'var(--ph-surface-solid)' },
      }}
    >
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="sm" p="md">
          <TextInput
            label="Name"
            placeholder="Task name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="What needs to be done?"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            rows={2}
          />
          <Select
            label="Priority"
            data={[
              { value: '1', label: 'Low' },
              { value: '2', label: 'Medium' },
              { value: '3', label: 'High' },
            ]}
            value={priority}
            onChange={(v) => v && setPriority(v)}
          />

          <Switch
            label="Schedule for specific time"
            checked={isScheduled}
            onChange={(e) => setIsScheduled(e.currentTarget.checked)}
            color="rose"
          />

          {isScheduled && (
            <>
              <DateTimePicker
                label="Start Date & Time"
                placeholder="Pick a date and time"
                value={startDate}
                onChange={(val) => {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-expect-error
                  const dt = new Date(val);
                  setStartDate(dt);
                }}
                minDate={new Date()}
                clearable
                valueFormat="MM/DD/YYYY hh:mm A"
                popoverProps={{ withinPortal: true }}
              />
              <Select
                label="Repeat"
                data={[
                  { value: '0', label: 'No repeat' },
                  { value: '1', label: 'Daily' },
                  { value: '7', label: 'Weekly' },
                  { value: '14', label: 'Bi-weekly' },
                  { value: '30', label: 'Monthly' },
                ]}
                value={String(repeatDays)}
                onChange={(v) => setRepeatDays(parseInt(v ?? '0'))}
              />
            </>
          )}

          {!isScheduled && (
            <Text size="xs" c="dimmed">
              Quick task — will trigger 5 minutes from now
            </Text>
          )}

          <Switch
            label="Passive (runs automatically)"
            description="Task will execute without user interaction"
            checked={isPassive}
            onChange={(e) => setIsPassive(e.currentTarget.checked)}
            color="rose"
          />

          {/* ── Event hooks ── */}
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
            <Accordion.Item value="events">
              <Accordion.Control>
                <Group gap="xs">
                  <Text size="sm" fw={500}>Event Hooks</Text>
                  {eventCount > 0 && (
                    <Badge size="xs" color="rose" variant="filled">
                      {eventCount} set
                    </Badge>
                  )}
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Text size="xs" c="dimmed">
                    Attach events that fire at different points in this task's lifecycle.
                  </Text>

                  <EventPicker
                    label="On Run"
                    description="Fires when the task starts executing"
                    value={onRun}
                    onChange={setOnRun}
                    definitions={eventDefs}
                  />

                  <EventPicker
                    label="On Confirm"
                    description="Fires when the user confirms/completes the task"
                    value={onConfirm}
                    onChange={setOnConfirm}
                    definitions={eventDefs}
                  />

                  <EventPicker
                    label="On Cancel"
                    description="Fires when the user cancels or snoozes the task"
                    value={onCancel}
                    onChange={setOnCancel}
                    definitions={eventDefs}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancel</Button>
            <Button
              color="rose"
              onClick={handleSubmit}
              loading={createTask.isPending}
            >
              Create Task
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
