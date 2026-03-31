/**
 * Saved/favorite events manager.
 *
 * Lists all saved favorite events with the ability to:
 *   - View the stored event payload
 *   - Test (fire) the event directly
 *   - Edit the event payload and re-save
 *   - Delete the event
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
  TextInput,
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
  IconBookmarkOff,
  IconRefresh,
  IconPlus,
} from '@tabler/icons-react';
import {
  useFavoriteEvents,
  useDeleteFavorite,
  useSaveFavorite,
  useFireEvent,
  useEventIntrospection,
} from '../../api/queries.ts';
import { parseDefinition, defaultForType, FieldInput } from './EventBuilder.tsx';
import type { EventDef } from '../../types/index.ts';

interface FavoriteItem {
  name: string;
  event: Record<string, unknown>;
}

/** Normalise raw API response into FavoriteItem[] */
function parseFavorites(raw: Record<string, unknown>[]): FavoriteItem[] {
  if (!Array.isArray(raw)) return [];
  // The API may return [{ name, event }] or a map-like structure
  return raw
    .map((item) => {
      if (typeof item.name === 'string' && item.event && typeof item.event === 'object') {
        return { name: item.name, event: item.event as Record<string, unknown> };
      }
      return null;
    })
    .filter((x): x is FavoriteItem => x !== null);
}

export function FavoriteEvents() {
  const { data: rawFavorites, isPending, isError, refetch } = useFavoriteEvents();
  const deleteFavorite = useDeleteFavorite();
  const fireEvent = useFireEvent();
  const [addOpen, setAddOpen] = useState(false);

  const favorites = parseFavorites(rawFavorites ?? []);

  if (isPending) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Loader size="sm" color="var(--ph-accent)" />
          <Text size="sm" c="dimmed">Loading saved events...</Text>
        </Stack>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Text size="sm" c="red">Failed to load saved events</Text>
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
          New
        </Button>
      </Group>

      {favorites.length === 0 ? (
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
              <IconBookmarkOff size={24} color="var(--ph-accent)" />
            </Box>
            <Text fw={600} size="md">No saved events</Text>
            <Text size="sm" c="dimmed">
              Use the Sandbox to build and save events, or click New above
            </Text>
          </Stack>
        </Card>
      ) : (
        favorites.map((fav) => (
          <FavoriteCard
            key={fav.name}
            favorite={fav}
            onDelete={(name) => {
              deleteFavorite.mutate(name, {
                onSuccess: () =>
                  notifications.show({ title: 'Deleted', message: name, color: 'gray' }),
                onError: () =>
                  notifications.show({ title: 'Failed', message: 'Could not delete event', color: 'red' }),
              });
            }}
            onFire={(event) => {
              fireEvent.mutate(event, {
                onSuccess: () =>
                  notifications.show({ title: 'Event fired', message: event.type as string, color: 'green' }),
                onError: () =>
                  notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
              });
            }}
          />
        ))
      )}

      <AddFavoriteModal opened={addOpen} onClose={() => setAddOpen(false)} />
    </Stack>
  );
}

// ─── Individual favorite card ──────────────────────────────────────

interface FavoriteCardProps {
  favorite: FavoriteItem;
  onDelete: (name: string) => void;
  onFire: (event: Record<string, unknown>) => void;
}

function FavoriteCard({ favorite, onDelete, onFire }: FavoriteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const eventType = (favorite.event.type as string) ?? 'unknown';
  const fieldCount = Object.keys(favorite.event).filter((k) => k !== 'type').length;

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
        {/* Header row */}
        <Group
          justify="space-between"
          wrap="nowrap"
          px="md"
          py="sm"
          style={{ cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <Box>
              <Text fw={600} size="sm" lineClamp={1}>
                {favorite.name}
              </Text>
              <Group gap={6} mt={2}>
                <Badge size="xs" variant="light" color="rose">
                  {eventType}
                </Badge>
                {fieldCount > 0 && (
                  <Text size="10px" c="dimmed">
                    {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                  </Text>
                )}
              </Group>
            </Box>
          </Group>

          <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label="Test event" withArrow>
              <ActionIcon
                variant="light"
                color="rose"
                size="sm"
                radius="xl"
                onClick={(e) => { e.stopPropagation(); onFire(favorite.event); }}
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
                  <Text size="xs">Delete "{favorite.name}"?</Text>
                  <Group gap={6} justify="flex-end">
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button size="compact-xs" color="red" onClick={() => { setConfirmDelete(false); onDelete(favorite.name); }}>
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

        {/* Expanded payload view */}
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
              {JSON.stringify(favorite.event, null, 2)}
            </Code>
          </Box>
        </Collapse>
      </Card>

      {/* Edit modal */}
      <EditFavoriteModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        favorite={favorite}
      />
    </>
  );
}

// ─── Edit modal with sandbox-style form ────────────────────────────

interface EditModalProps {
  opened: boolean;
  onClose: () => void;
  favorite: FavoriteItem;
}

function EditFavoriteModal({ opened, onClose, favorite }: EditModalProps) {
  const saveFavorite = useSaveFavorite();
  const fireEvent = useFireEvent();
  const introspect = useEventIntrospection();

  const [selectedType, setSelectedType] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Fetch definitions when modal opens
  const definitions: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  // Load definitions and reset form state when opened
  useEffect(() => {
    if (opened) {
      if (!introspect.data) introspect.mutate(undefined);
      const eventType = (favorite.event.type as string) ?? '';
      setSelectedType(eventType);
      const { type: _, ...rest } = favorite.event;
      setFieldValues(rest);
      setShowPreview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const selectedDef = useMemo(
    () => definitions.find((d) => d.type === selectedType) ?? null,
    [definitions, selectedType],
  );

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

  const buildPayload = useCallback((): Record<string, unknown> | null => {
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
    const p = buildPayload();
    return p ? JSON.stringify(p, null, 2) : '';
  }, [buildPayload]);

  const handleSave = () => {
    const payload = buildPayload();
    if (!payload) return;
    saveFavorite.mutate(
      { name: favorite.name, event: payload },
      {
        onSuccess: () => {
          notifications.show({ title: 'Saved', message: favorite.name, color: 'green' });
          onClose();
        },
        onError: () =>
          notifications.show({ title: 'Failed', message: 'Could not save event', color: 'red' }),
      },
    );
  };

  const handleTest = () => {
    const payload = buildPayload();
    if (!payload) return;
    fireEvent.mutate(payload, {
      onSuccess: () =>
        notifications.show({ title: 'Event fired', message: selectedType, color: 'green' }),
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Edit: ${favorite.name}`}
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
          {/* Event type selector */}
          {introspect.isPending ? (
            <Group gap="xs" py="sm">
              <Loader size="xs" color="var(--ph-accent)" />
              <Text size="xs" c="dimmed">Loading event types...</Text>
            </Group>
          ) : (
            <Select
              label="Event Type"
              placeholder="Select an event type..."
              data={definitions.map((d) => ({ value: d.type, label: d.type }))}
              value={selectedType || null}
              onChange={handleSelectEvent}
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
                      onChange={(v) => setField(field.name, v)}
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
                  onClick={() => setShowPreview(!showPreview)}
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

          {/* Actions */}
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
              disabled={!buildPayload()}
              onClick={handleTest}
            >
              Test
            </Button>
            <Button
              color="rose"
              size="compact-sm"
              loading={saveFavorite.isPending}
              disabled={!buildPayload()}
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

// ─── Add favorite modal ────────────────────────────────────────────

function AddFavoriteModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const saveFavorite = useSaveFavorite();
  const fireEvent = useFireEvent();
  const introspect = useEventIntrospection();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);

  const definitions: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  useEffect(() => {
    if (opened) {
      if (!introspect.data) introspect.mutate(undefined);
      setName('');
      setSelectedType('');
      setFieldValues({});
      setShowPreview(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const selectedDef = useMemo(
    () => definitions.find((d) => d.type === selectedType) ?? null,
    [definitions, selectedType],
  );

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

  const setField = (fieldName: string, value: unknown) =>
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));

  const buildPayload = useCallback((): Record<string, unknown> | null => {
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
    const p = buildPayload();
    return p ? JSON.stringify(p, null, 2) : '';
  }, [buildPayload]);

  const handleSave = () => {
    if (!name.trim()) {
      notifications.show({ title: 'Error', message: 'Name is required', color: 'red' });
      return;
    }
    const payload = buildPayload();
    if (!payload) return;
    saveFavorite.mutate(
      { name: name.trim(), event: payload },
      {
        onSuccess: () => {
          notifications.show({ title: 'Saved', message: name, color: 'green' });
          onClose();
        },
        onError: () =>
          notifications.show({ title: 'Failed', message: 'Could not save event', color: 'red' }),
      },
    );
  };

  const handleTest = () => {
    const payload = buildPayload();
    if (!payload) return;
    fireEvent.mutate(payload, {
      onSuccess: () =>
        notifications.show({ title: 'Event fired', message: selectedType, color: 'green' }),
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="New Saved Event"
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
          <TextInput
            label="Name"
            placeholder="My saved event"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
          />

          {/* Event type selector */}
          {introspect.isPending ? (
            <Group gap="xs" py="sm">
              <Loader size="xs" color="var(--ph-accent)" />
              <Text size="xs" c="dimmed">Loading event types...</Text>
            </Group>
          ) : (
            <Select
              label="Event Type"
              placeholder="Select an event type..."
              data={definitions.map((d) => ({ value: d.type, label: d.type }))}
              value={selectedType || null}
              onChange={handleSelectEvent}
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
                      onChange={(v) => setField(field.name, v)}
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
                  onClick={() => setShowPreview(!showPreview)}
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

          {/* Actions */}
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
              disabled={!buildPayload()}
              onClick={handleTest}
            >
              Test
            </Button>
            <Button
              color="rose"
              size="compact-sm"
              loading={saveFavorite.isPending}
              disabled={!name.trim() || !buildPayload()}
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
