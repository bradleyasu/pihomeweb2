/**
 * AirPlay react listeners manager.
 *
 * Lists registered AirPlay listeners with the ability to:
 *   - View the stored action payload
 *   - Test (fire) the action event
 *   - Edit the trigger and action, then re-save (remove + re-add)
 *   - Delete the listener
 *   - Add new listeners
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Stack,
  Card,
  Text,
  Group,
  Badge,
  ActionIcon,
  Button,
  Code,
  Collapse,
  Box,
  Modal,
  Select,
  Tooltip,
  Loader,
  Popover,
  Divider,
  ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconEdit,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconRefresh,
  IconHeadphones,
  IconPlayerPlay,
  IconPlayerStop,
} from '@tabler/icons-react';
import {
  useAirPlayListeners,
  useAddAirPlayListener,
  useRemoveAirPlayListener,
  useFireEvent,
  useEventIntrospection,
  type AirPlayListener,
} from '../../api/queries.ts';
import { parseDefinition, defaultForType, FieldInput } from './EventBuilder.tsx';
import type { EventDef } from '../../types/index.ts';

export function AirPlayListeners() {
  const { data: listeners, isPending, isError, refetch } = useAirPlayListeners();
  const removeListener = useRemoveAirPlayListener();
  const fireEvent = useFireEvent();
  const [addOpen, setAddOpen] = useState(false);

  if (isPending) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Loader size="sm" color="var(--ph-accent)" />
          <Text size="sm" c="dimmed">Loading AirPlay listeners...</Text>
        </Stack>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Text size="sm" c="red">Failed to load AirPlay listeners</Text>
          <Button
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      <Group justify="flex-end">
        <Button
          size="compact-sm"
          color="rose"
          leftSection={<IconPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          New Listener
        </Button>
      </Group>

      {(listeners ?? []).length === 0 ? (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'var(--ph-accent-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconHeadphones size={24} color="var(--ph-accent)" />
            </Box>
            <Text fw={600} size="md">No AirPlay listeners</Text>
            <Text size="sm" c="dimmed">
              Add a listener to react to AirPlay start/stop events
            </Text>
          </Stack>
        </Card>
      ) : (
        (listeners ?? []).map((listener) => (
          <ListenerCard
            key={listener.id}
            listener={listener}
            onDelete={(id) => {
              removeListener.mutate(id, {
                onSuccess: () =>
                  notifications.show({ title: 'Deleted', message: 'Listener removed', color: 'gray' }),
                onError: () =>
                  notifications.show({ title: 'Failed', message: 'Could not remove listener', color: 'red' }),
              });
            }}
            onFire={(action) => {
              fireEvent.mutate(action, {
                onSuccess: () =>
                  notifications.show({ title: 'Event fired', message: action.type as string, color: 'green' }),
                onError: () =>
                  notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
              });
            }}
          />
        ))
      )}

      <AddListenerModal opened={addOpen} onClose={() => setAddOpen(false)} />
    </Stack>
  );
}

// ─── Listener card ─────────────────────────────────────────────────

interface ListenerCardProps {
  listener: AirPlayListener;
  onDelete: (id: string) => void;
  onFire: (action: Record<string, unknown>) => void;
}

function ListenerCard({ listener, onDelete, onFire }: ListenerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const actionType = (listener.action.type as string) ?? 'unknown';
  const fieldCount = Object.keys(listener.action).filter((k) => k !== 'type').length;
  const isStart = listener.trigger === 'on_start';

  return (
    <>
      <Card
        p={0}
        style={{
          background: 'rgba(30, 30, 46, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
      >
        <Group
          justify="space-between"
          wrap="nowrap"
          px="md"
          py="sm"
          style={{ cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            {isStart
              ? <IconPlayerPlay size={16} color="var(--mantine-color-green-6)" />
              : <IconPlayerStop size={16} color="var(--mantine-color-red-6)" />
            }
            <Box>
              <Group gap={6}>
                <Text fw={600} size="sm">{actionType}</Text>
              </Group>
              <Group gap={6} mt={2}>
                <Badge size="xs" variant="light" color={isStart ? 'green' : 'red'}>
                  {listener.trigger}
                </Badge>
                {fieldCount > 0 && (
                  <Text size="10px" c="dimmed">
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  </Text>
                )}
                <Text size="10px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                  {listener.id.slice(0, 8)}
                </Text>
              </Group>
            </Box>
          </Group>

          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label="Test action" withArrow>
              <ActionIcon
                variant="light"
                color="rose"
                size="sm"
                radius="xl"
                onClick={(e) => { e.stopPropagation(); onFire(listener.action); }}
              >
                <IconBolt size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit" withArrow>
              <ActionIcon
                variant="light"
                color="gray"
                size="sm"
                radius="xl"
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
            <Popover opened={confirmDelete} onChange={setConfirmDelete} position="left" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Delete" withArrow>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    radius="xl"
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown p="xs" onClick={(e) => e.stopPropagation()}>
                <Stack gap={6}>
                  <Text size="xs">Remove this listener?</Text>
                  <Group gap={6} justify="flex-end">
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button size="compact-xs" color="red" onClick={() => { setConfirmDelete(false); onDelete(listener.id); }}>
                      Delete
                    </Button>
                  </Group>
                </Stack>
              </Popover.Dropdown>
            </Popover>
            {expanded
              ? <IconChevronUp size={14} color="var(--ph-text-dim)" />
              : <IconChevronDown size={14} color="var(--ph-text-dim)" />
            }
          </Group>
        </Group>

        <Collapse in={expanded}>
          <Box px="md" pb="sm">
            <Code
              block
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                fontSize: 12,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {JSON.stringify({ trigger: listener.trigger, action: listener.action }, null, 2)}
            </Code>
          </Box>
        </Collapse>
      </Card>

      <EditListenerModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        listener={listener}
      />
    </>
  );
}

// ─── Shared form for add/edit ──────────────────────────────────────

interface ListenerFormProps {
  trigger: string;
  onTriggerChange: (t: string) => void;
  selectedType: string;
  onSelectType: (t: string | null) => void;
  fieldValues: Record<string, unknown>;
  onFieldChange: (name: string, value: unknown) => void;
  definitions: EventDef[];
  defsLoading: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
  payloadPreview: string;
}

function ListenerForm({
  trigger,
  onTriggerChange,
  selectedType,
  onSelectType,
  fieldValues,
  onFieldChange,
  definitions,
  defsLoading,
  showPreview,
  onTogglePreview,
  payloadPreview,
}: ListenerFormProps) {
  const selectedDef = useMemo(
    () => definitions.find((d) => d.type === selectedType) ?? null,
    [definitions, selectedType],
  );

  return (
    <>
      {/* Trigger selector */}
      <Select
        label="Trigger"
        description="When should this listener fire?"
        data={[
          { value: 'on_start', label: 'On Start — when AirPlay begins playing' },
          { value: 'on_stop', label: 'On Stop — when AirPlay stops playing' },
        ]}
        value={trigger}
        onChange={(v) => v && onTriggerChange(v)}
        size="sm"
        styles={{
          input: { background: 'var(--ph-surface)', border: '1px solid var(--ph-border)' },
        }}
      />

      <Divider color="var(--ph-border)" />

      {/* Event type selector */}
      {defsLoading ? (
        <Group gap="xs" py="sm">
          <Loader size="xs" color="var(--ph-accent)" />
          <Text size="xs" c="dimmed">Loading event types...</Text>
        </Group>
      ) : (
        <Select
          label="Action Event"
          description="The event to execute when triggered"
          placeholder="Select an event type..."
          data={definitions.map((d) => ({ value: d.type, label: d.type }))}
          value={selectedType || null}
          onChange={onSelectType}
          searchable
          size="sm"
          styles={{
            input: { background: 'var(--ph-surface)', border: '1px solid var(--ph-border)' },
          }}
        />
      )}

      {/* Dynamic fields */}
      {selectedDef && (
        <>
          <Divider color="var(--ph-border)" />
          {selectedDef.fields.length > 0 ? (
            <Stack gap="sm">
              {selectedDef.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={fieldValues[field.name]}
                  onChange={(v) => onFieldChange(field.name, v)}
                  allDefs={definitions}
                />
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" ta="center" py="md">
              This event has no parameters.
            </Text>
          )}
        </>
      )}

      {/* Payload preview */}
      {selectedType && (
        <>
          <Divider color="var(--ph-border)" />
          <Box>
            <Group
              justify="space-between"
              style={{ cursor: 'pointer' }}
              onClick={onTogglePreview}
              mb={showPreview ? 'xs' : 0}
            >
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                Payload Preview
              </Text>
              {showPreview
                ? <IconChevronUp size={14} color="var(--ph-text-dim)" />
                : <IconChevronDown size={14} color="var(--ph-text-dim)" />
              }
            </Group>
            <Collapse in={showPreview}>
              <Code
                block
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  fontSize: 12,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {payloadPreview}
              </Code>
            </Collapse>
          </Box>
        </>
      )}
    </>
  );
}

// ─── Hook: shared form state ───────────────────────────────────────

function useListenerForm(
  initialTrigger: string,
  initialAction: Record<string, unknown>,
  opened: boolean,
) {
  const introspect = useEventIntrospection();

  const [trigger, setTrigger] = useState(initialTrigger);
  const [selectedType, setSelectedType] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);

  const definitions: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  // Load definitions and reset form when opened
  useEffect(() => {
    if (opened) {
      if (!introspect.data) introspect.mutate(undefined);
      setTrigger(initialTrigger);
      const actionType = (initialAction.type as string) ?? '';
      setSelectedType(actionType);
      const { type: _, ...rest } = initialAction;
      setFieldValues(rest);
      setShowPreview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSelectEvent = useCallback(
    (type: string | null) => {
      const t = type ?? '';
      setSelectedType(t);
      const def = definitions.find((d) => d.type === t);
      if (def) {
        const init: Record<string, unknown> = {};
        def.fields.forEach((f) => { init[f.name] = defaultForType(f.type); });
        setFieldValues(init);
      } else {
        setFieldValues({});
      }
    },
    [definitions],
  );

  const setField = (name: string, value: unknown) =>
    setFieldValues((prev) => ({ ...prev, [name]: value }));

  const buildActionPayload = useCallback((): Record<string, unknown> | null => {
    if (!selectedType) return null;
    const payload: Record<string, unknown> = { type: selectedType };
    for (const [k, v] of Object.entries(fieldValues)) {
      if (v === '' || v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
      payload[k] = v;
    }
    return payload;
  }, [selectedType, fieldValues]);

  const payloadPreview = useMemo(() => {
    const action = buildActionPayload();
    if (!action) return '';
    return JSON.stringify({ trigger, action }, null, 2);
  }, [trigger, buildActionPayload]);

  return {
    trigger,
    setTrigger,
    selectedType,
    handleSelectEvent,
    fieldValues,
    setField,
    definitions,
    defsLoading: introspect.isPending,
    showPreview,
    togglePreview: () => setShowPreview((p) => !p),
    buildActionPayload,
    payloadPreview,
  };
}

// ─── Add listener modal ────────────────────────────────────────────

function AddListenerModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const addListener = useAddAirPlayListener();
  const fireEvent = useFireEvent();

  const form = useListenerForm('on_start', {}, opened);

  const handleAdd = () => {
    const action = form.buildActionPayload();
    if (!action) return;
    addListener.mutate(
      { trigger: form.trigger, event: action },
      {
        onSuccess: () => {
          notifications.show({ title: 'Added', message: 'AirPlay listener created', color: 'green' });
          onClose();
        },
        onError: () =>
          notifications.show({ title: 'Failed', message: 'Could not add listener', color: 'red' }),
      },
    );
  };

  const handleTest = () => {
    const action = form.buildActionPayload();
    if (!action) return;
    fireEvent.mutate(action, {
      onSuccess: () =>
        notifications.show({ title: 'Event fired', message: form.selectedType, color: 'green' }),
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New AirPlay Listener"
      centered
      size="lg"
      styles={{
        header: { background: 'var(--ph-surface-solid)', borderBottom: '1px solid var(--ph-border)' },
        body: { background: 'var(--ph-surface-solid)', padding: 0 },
        content: { background: 'var(--ph-surface-solid)' },
      }}
    >
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="md" p="md">
          <ListenerForm
            trigger={form.trigger}
            onTriggerChange={form.setTrigger}
            selectedType={form.selectedType}
            onSelectType={form.handleSelectEvent}
            fieldValues={form.fieldValues}
            onFieldChange={form.setField}
            definitions={form.definitions}
            defsLoading={form.defsLoading}
            showPreview={form.showPreview}
            onTogglePreview={form.togglePreview}
            payloadPreview={form.payloadPreview}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" size="compact-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="light"
              color="rose"
              size="compact-sm"
              leftSection={<IconBolt size={14} />}
              loading={fireEvent.isPending}
              disabled={!form.buildActionPayload()}
              onClick={handleTest}
            >
              Test
            </Button>
            <Button
              color="rose"
              size="compact-sm"
              loading={addListener.isPending}
              disabled={!form.buildActionPayload()}
              onClick={handleAdd}
            >
              Add Listener
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}

// ─── Edit listener modal ───────────────────────────────────────────

interface EditListenerModalProps {
  opened: boolean;
  onClose: () => void;
  listener: AirPlayListener;
}

function EditListenerModal({ opened, onClose, listener }: EditListenerModalProps) {
  const removeListener = useRemoveAirPlayListener();
  const addListener = useAddAirPlayListener();
  const fireEvent = useFireEvent();

  const form = useListenerForm(listener.trigger, listener.action, opened);

  // Edit = remove old + add new
  const handleSave = () => {
    const action = form.buildActionPayload();
    if (!action) return;
    removeListener.mutate(listener.id, {
      onSuccess: () => {
        addListener.mutate(
          { trigger: form.trigger, event: action },
          {
            onSuccess: () => {
              notifications.show({ title: 'Updated', message: 'Listener updated', color: 'green' });
              onClose();
            },
            onError: () =>
              notifications.show({ title: 'Failed', message: 'Could not re-add listener', color: 'red' }),
          },
        );
      },
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not remove old listener', color: 'red' }),
    });
  };

  const handleTest = () => {
    const action = form.buildActionPayload();
    if (!action) return;
    fireEvent.mutate(action, {
      onSuccess: () =>
        notifications.show({ title: 'Event fired', message: form.selectedType, color: 'green' }),
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
    });
  };

  const saving = removeListener.isPending || addListener.isPending;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit AirPlay Listener"
      centered
      size="lg"
      styles={{
        header: { background: 'var(--ph-surface-solid)', borderBottom: '1px solid var(--ph-border)' },
        body: { background: 'var(--ph-surface-solid)', padding: 0 },
        content: { background: 'var(--ph-surface-solid)' },
      }}
    >
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="md" p="md">
          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
            ID: {listener.id}
          </Text>

          <ListenerForm
            trigger={form.trigger}
            onTriggerChange={form.setTrigger}
            selectedType={form.selectedType}
            onSelectType={form.handleSelectEvent}
            fieldValues={form.fieldValues}
            onFieldChange={form.setField}
            definitions={form.definitions}
            defsLoading={form.defsLoading}
            showPreview={form.showPreview}
            onTogglePreview={form.togglePreview}
            payloadPreview={form.payloadPreview}
          />

          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" size="compact-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="light"
              color="rose"
              size="compact-sm"
              leftSection={<IconBolt size={14} />}
              loading={fireEvent.isPending}
              disabled={!form.buildActionPayload()}
              onClick={handleTest}
            >
              Test
            </Button>
            <Button
              color="rose"
              size="compact-sm"
              loading={saving}
              disabled={!form.buildActionPayload()}
              onClick={handleSave}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
