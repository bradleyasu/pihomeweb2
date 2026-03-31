/**
 * Dynamic event builder powered by introspection.
 *
 * Fetches all available event definitions from the PiHome introspection API,
 * parses them into normalised structures, then generates a dynamic form
 * with type-appropriate inputs for each field:
 *
 *   - string       → TextInput
 *   - integer/number → NumberInput
 *   - boolean      → Toggle switch
 *   - color        → Color picker (Kivy RGBA ↔ hex)
 *   - object/json/dict → Key-value pair editor
 *   - event        → Nested event selector (recursive)
 *   - list/array   → Event list editor (multiple nested events)
 *   - default      → TextInput fallback
 *
 * The payload preview updates in real-time and can be copied to clipboard.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Stack,
  Select,
  TextInput,
  NumberInput,
  Button,
  Card,
  Text,
  Group,
  Code,
  Collapse,
  Box,
  Badge,
  ActionIcon,
  ColorInput,
  Tooltip,
  Loader,
  Divider,
  Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBolt,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconCheck,
  IconPlus,
  IconTrash,
  IconRefresh,
  IconBookmark,
} from '@tabler/icons-react';
import { useEventIntrospection, useFireEvent } from '../../api/queries.ts';
import type { EventPayload, RawEventDef, EventDef, FieldDef } from '../../types/index.ts';

/** Copy text to clipboard with fallback for non-secure contexts (plain HTTP) */
function copyToClipboard(text: string): boolean {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  // Fallback: create a temporary textarea and use execCommand
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(ta);
  return ok;
}

// ─── Parsing ────────────────────────────────────────────────────────

/** Parse a raw API definition object into our normalised EventDef shape */
export function parseDefinition(raw: RawEventDef): EventDef {
  const fields: FieldDef[] = Object.entries(raw)
    .filter(([key]) => key !== 'type')
    .map(([name, meta]) => {
      const m = meta as Record<string, unknown> | null;
      const fieldType = (typeof m?.type === 'string' ? m.type : 'string').toLowerCase();
      const def: FieldDef = {
        name,
        type: fieldType,
        required: (m?.required as boolean) ?? false,
        description: (m?.description as string) ?? null,
      };
      // Carry through options for "option" type fields
      if (fieldType === 'option' && m?.options) {
        if (Array.isArray(m.options)) {
          def.options = m.options as string[];
        } else if (typeof m.options === 'object') {
          def.options = m.options as Record<string, string>;
        }
      }
      return def;
    });
  return { type: raw.type as string, fields };
}

/** Get the default initial value for a given field type */
export function defaultForType(type: string): unknown {
  switch (type) {
    case 'boolean': return false;
    case 'integer':
    case 'number': return 0;
    case 'list':
    case 'array':
    case 'event_list': return [];
    case 'object':
    case 'json':
    case 'dict': return {};
    case 'color': return [1, 1, 1, 1];
    default: return '';
  }
}

// ─── Kivy RGBA ↔ Hex conversion ────────────────────────────────────

/** Convert a Kivy [r, g, b, a] (0–1 floats) to CSS hex string */
function kivyToHex(kivy: number[]): string {
  if (!Array.isArray(kivy) || kivy.length < 3) return '#ffffff';
  const h = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(kivy[0])}${h(kivy[1])}${h(kivy[2])}`;
}

/** Convert a CSS hex string to Kivy [r, g, b, 1.0] */
function hexToKivy(hex: string): number[] {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return [1, 1, 1, 1];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return [round(r), round(g), round(b), 1.0];
}

// ─── Key-Value field (object / json / dict) ─────────────────────────

interface KVFieldProps {
  field: FieldDef;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}

function KVField({ field, value, onChange }: KVFieldProps) {
  const entries: [string, string][] = Object.entries(value ?? {});

  const setEntry = (i: number, k: string, v: string) => {
    const next = [...entries];
    next[i] = [k, v];
    onChange(Object.fromEntries(next));
  };

  const addEntry = () => onChange({ ...(value ?? {}), '': '' });

  const removeEntry = (i: number) => {
    const next = entries.filter((_, idx) => idx !== i);
    onChange(Object.fromEntries(next));
  };

  return (
    <Box>
      <Group gap={4} mb={4}>
        <Text size="sm" fw={500}>{field.name}</Text>
        {field.required && <Text size="xs" c="red">*</Text>}
        <Badge size="xs" variant="light" color="gray">object</Badge>
      </Group>
      <Stack gap="xs">
        {entries.map(([k, v], i) => (
          <Group key={i} gap="xs" wrap="nowrap">
            <TextInput
              placeholder="key"
              value={k}
              onChange={(e) => setEntry(i, e.currentTarget.value, v)}
              style={{ flex: 1 }}
              size="xs"
            />
            <TextInput
              placeholder="value"
              value={v}
              onChange={(e) => setEntry(i, k, e.currentTarget.value)}
              style={{ flex: 1 }}
              size="xs"
            />
            <ActionIcon
              variant="subtle"
              color="red"
              size="sm"
              onClick={() => removeEntry(i)}
              title="Remove"
            >
              <IconTrash size={13} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconPlus size={13} />}
          onClick={addEntry}
          style={{ alignSelf: 'flex-start' }}
        >
          Add property
        </Button>
      </Stack>
      {field.description && <Text size="xs" c="dimmed" mt={2}>{field.description}</Text>}
    </Box>
  );
}

// ─── Color field (Kivy RGBA) ────────────────────────────────────────

interface ColorFieldProps {
  field: FieldDef;
  value: number[];
  onChange: (v: number[]) => void;
}

function ColorField({ field, value, onChange }: ColorFieldProps) {
  const kivy = Array.isArray(value) && value.length >= 3 ? value : [1, 1, 1, 1];
  const hex = kivyToHex(kivy);

  return (
    <Box>
      <Group gap={4} mb={4}>
        <Text size="sm" fw={500}>{field.name}</Text>
        {field.required && <Text size="xs" c="red">*</Text>}
        <Badge size="xs" variant="light" color="gray">color</Badge>
      </Group>
      <Group gap="sm" wrap="nowrap">
        <ColorInput
          value={hex}
          onChange={(v) => onChange(hexToKivy(v))}
          format="hex"
          style={{ flex: 1 }}
          size="sm"
        />
        <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          [{kivy.map((n) => n.toFixed(3)).join(', ')}]
        </Text>
      </Group>
      {field.description && <Text size="xs" c="dimmed" mt={2}>{field.description}</Text>}
    </Box>
  );
}

// ─── Event list field (list of nested events) ───────────────────────

interface EventListFieldProps {
  field: FieldDef;
  value: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
  allDefs: EventDef[];
}

function EventListField({ field, value, onChange, allDefs }: EventListFieldProps) {
  const items = Array.isArray(value) ? value : [];

  const setItem = (i: number, v: Record<string, unknown>) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };

  const addItem = () => onChange([...items, { type: '' }]);
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <Box>
      <Group gap={4} mb={4}>
        <Text size="sm" fw={500}>{field.name}</Text>
        {field.required && <Text size="xs" c="red">*</Text>}
        <Badge size="xs" variant="light" color="gray">event list</Badge>
      </Group>
      <Stack gap="sm">
        {items.map((item, i) => {
          const nestedType = (item?.type as string) ?? '';
          const nestedDef = allDefs.find((d) => d.type === nestedType) ?? null;
          return (
            <Card key={i} p="xs" withBorder style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Group gap="xs" mb={nestedDef ? 'xs' : 0}>
                <Select
                  placeholder="Select event type"
                  data={allDefs.map((d) => ({ value: d.type, label: d.type }))}
                  value={nestedType || null}
                  onChange={(v) => setItem(i, { type: v ?? '' })}
                  searchable
                  size="xs"
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => removeItem(i)}
                  title="Remove event"
                >
                  <IconTrash size={13} />
                </ActionIcon>
              </Group>
              {nestedDef && nestedDef.fields.length > 0 && (
                <Stack gap="xs" pl="xs" style={{ borderLeft: '2px solid rgba(227, 74, 111, 0.2)' }}>
                  {nestedDef.fields.map((nf) => (
                    <FieldInput
                      key={nf.name}
                      field={nf}
                      value={item?.[nf.name]}
                      onChange={(v) => setItem(i, { ...(item ?? { type: nestedType }), [nf.name]: v })}
                      allDefs={allDefs}
                    />
                  ))}
                </Stack>
              )}
            </Card>
          );
        })}
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          leftSection={<IconPlus size={13} />}
          onClick={addItem}
          style={{ alignSelf: 'flex-start' }}
        >
          Add event
        </Button>
      </Stack>
      {field.description && <Text size="xs" c="dimmed" mt={2}>{field.description}</Text>}
    </Box>
  );
}

// ─── Single field input (recursive for nested events) ───────────────

interface FieldInputProps {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  allDefs: EventDef[];
}

export function FieldInput({ field, value, onChange, allDefs }: FieldInputProps) {
  /** Shared label with required indicator and type badge */
  const fieldLabel = (
    <Group gap={4}>
      <Text size="sm" fw={500}>{field.name}</Text>
      {field.required && <Text size="xs" c="red">*</Text>}
      {field.type !== 'string' && (
        <Badge size="xs" variant="light" color="gray">{field.type}</Badge>
      )}
    </Group>
  );

  // ── boolean → toggle button ──
  if (field.type === 'boolean') {
    return (
      <Box>
        <Group gap="sm" justify="space-between">
          <Box>
            <Group gap={4}>
              <Text size="sm" fw={500}>{field.name}</Text>
              {field.required && <Text size="xs" c="red">*</Text>}
            </Group>
            {field.description && <Text size="xs" c="dimmed">{field.description}</Text>}
          </Box>
          <Button
            variant={value ? 'filled' : 'outline'}
            color={value ? 'green' : 'gray'}
            size="xs"
            onClick={() => onChange(!value)}
            style={{ minWidth: 56, transition: 'all 0.15s ease' }}
          >
            {value ? 'On' : 'Off'}
          </Button>
        </Group>
      </Box>
    );
  }

  // ── integer / number → NumberInput ──
  if (field.type === 'integer' || field.type === 'number') {
    return (
      <NumberInput
        label={fieldLabel}
        description={field.description}
        value={(value as number) ?? ''}
        onChange={(v) => onChange(v === '' ? '' : Number(v))}
        size="sm"
      />
    );
  }

  // ── list / array / event_list → event list editor ──
  if (field.type === 'list' || field.type === 'array' || field.type === 'event_list') {
    return (
      <EventListField
        field={field}
        value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
        onChange={onChange}
        allDefs={allDefs}
      />
    );
  }

  // ── object / json / dict → key-value pair editor ──
  if (field.type === 'object' || field.type === 'json' || field.type === 'dict') {
    return (
      <KVField
        field={field}
        value={value && typeof value === 'object' ? (value as Record<string, string>) : {}}
        onChange={onChange}
      />
    );
  }

  // ── event → inline nested event selector (recursive) ──
  if (field.type === 'event') {
    const nestedVal = value as Record<string, unknown> | null;
    const nestedType = (nestedVal?.type as string) ?? '';
    const nestedDef = allDefs.find((d) => d.type === nestedType) ?? null;

    return (
      <Box>
        {fieldLabel}
        <Card p="xs" mt={4} withBorder style={{ borderColor: 'rgba(227, 74, 111, 0.15)' }}>
          <Stack gap="xs">
            <Select
              placeholder="Select event type"
              data={[
                { value: '', label: '— none —' },
                ...allDefs.map((d) => ({ value: d.type, label: d.type })),
              ]}
              value={nestedType || null}
              onChange={(v) => onChange(v ? { type: v } : null)}
              searchable
              size="xs"
            />
            {nestedDef && nestedDef.fields.length > 0 && (
              <Stack gap="xs" pl="xs" style={{ borderLeft: '2px solid rgba(227, 74, 111, 0.2)' }}>
                {nestedDef.fields.map((nf) => (
                  <FieldInput
                    key={nf.name}
                    field={nf}
                    value={nestedVal?.[nf.name]}
                    onChange={(v) =>
                      onChange({ ...(nestedVal ?? { type: nestedType }), [nf.name]: v })
                    }
                    allDefs={allDefs}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Card>
        {field.description && <Text size="xs" c="dimmed" mt={2}>{field.description}</Text>}
      </Box>
    );
  }

  // ── color → Kivy RGBA color picker ──
  if (field.type === 'color') {
    return (
      <ColorField
        field={field}
        value={Array.isArray(value) ? (value as number[]) : [1, 1, 1, 1]}
        onChange={onChange}
      />
    );
  }

  // ── option → Select dropdown ──
  if (field.type === 'option' && field.options) {
    const selectData = Array.isArray(field.options)
      ? field.options.map((v) => ({ value: String(v), label: String(v) }))
      : Object.entries(field.options).map(([k, v]) => ({ value: k, label: v }));

    return (
      <Select
        label={fieldLabel}
        description={field.description}
        placeholder={`Select ${field.name}`}
        data={selectData}
        value={value != null && value !== '' ? String(value) : null}
        onChange={(v) => {
          if (!v) { onChange(''); return; }
          // Cast to number if all option values are numeric
          const vals = Array.isArray(field.options)
            ? field.options.map(String)
            : Object.keys(field.options!);
          const allNumeric = vals.every((s) => s !== '' && !isNaN(Number(s)));
          onChange(allNumeric ? Number(v) : v);
        }}
        searchable
        size="sm"
      />
    );
  }

  // ── default: string / unknown → TextInput ──
  return (
    <TextInput
      label={fieldLabel}
      description={field.description}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={field.description ?? field.name}
      size="sm"
    />
  );
}

// ─── EventBuilder (main component) ──────────────────────────────────

export function EventBuilder() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const introspect = useEventIntrospection();
  const fireEvent = useFireEvent();
  const saveEvent = useFireEvent();

  // Load event definitions on mount
  useEffect(() => {
    introspect.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse raw definitions into normalised EventDef[]
  const definitions: EventDef[] = useMemo(() => {
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [introspect.data]);

  const selectedDef = useMemo(
    () => definitions.find((d) => d.type === selectedType) ?? null,
    [definitions, selectedType],
  );

  /** When the user selects an event type, initialise field defaults */
  const handleSelectEvent = useCallback(
    (type: string | null) => {
      const t = type ?? '';
      setSelectedType(t);
      const def = definitions.find((d) => d.type === t);
      if (def) {
        const init: Record<string, unknown> = {};
        def.fields.forEach((f) => {
          init[f.name] = defaultForType(f.type);
        });
        setFieldValues(init);
      } else {
        setFieldValues({});
      }
    },
    [definitions],
  );

  const setField = (name: string, value: unknown) =>
    setFieldValues((prev) => ({ ...prev, [name]: value }));

  /** Build the final event payload, filtering out empty optional values */
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

  const handleFire = () => {
    const payload = buildPayload();
    if (!payload) return;
    setLastResponse(null);
    setShowResponse(false);
    fireEvent.mutate(payload as EventPayload, {
      onSuccess: (data) => {
        setLastResponse(data);
        setShowResponse(true);
        notifications.show({ title: 'Event fired', message: selectedType, color: 'green' });
      },
      onError: () =>
        notifications.show({ title: 'Failed', message: 'Could not fire event', color: 'red' }),
    });
  };

  // ── Loading state ──
  if (introspect.isPending) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Loader size="sm" color="var(--ph-accent)" />
          <Text size="sm" c="dimmed">Loading event definitions...</Text>
        </Stack>
      </Card>
    );
  }

  // ── Error state ──
  if (introspect.isError || (!introspect.isPending && !introspect.data)) {
    return (
      <Card p="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm">
          <Text size="sm" c="red">Failed to load event definitions</Text>
          <Button
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => introspect.mutate(undefined)}
          >
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  // ── Main UI ──
  return (
    <Stack gap="md">
      {/* Event type selector */}
      <Select
        placeholder="Select an event type..."
        data={definitions.map((d) => ({ value: d.type, label: d.type }))}
        value={selectedType || null}
        onChange={handleSelectEvent}
        searchable
        size="md"
        styles={{
          input: { background: 'var(--ph-surface)', border: '1px solid var(--ph-border)' },
        }}
      />

      {/* Fields form or placeholder */}
      {selectedDef ? (
        <Card p="md">
          <Stack gap="md">
            {/* Header */}
            <Group justify="space-between">
              <Group gap="xs">
                <Text fw={600} size="md" style={{ fontFamily: '"Outfit", sans-serif' }}>
                  {selectedDef.type}
                </Text>
                <Badge size="xs" variant="light" color="gray">
                  {selectedDef.fields.length} field{selectedDef.fields.length !== 1 ? 's' : ''}
                </Badge>
              </Group>
            </Group>

            <Divider color="var(--ph-border)" />

            {/* Dynamic fields */}
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

            <Divider color="var(--ph-border)" />

            {/* Payload preview */}
            <Box>
              <Group
                justify="space-between"
                mb={showPreview ? 'xs' : 0}
                style={{ cursor: 'pointer' }}
                onClick={() => setShowPreview(!showPreview)}
              >
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                  Payload Preview
                </Text>
                <Group gap={4}>
                  <Tooltip label={copied ? 'Copied!' : 'Copy'} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color={copied ? 'green' : 'gray'}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(payloadPreview);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                    </ActionIcon>
                  </Tooltip>
                  {showPreview
                    ? <IconChevronUp size={14} color="var(--ph-text-dim)" />
                    : <IconChevronDown size={14} color="var(--ph-text-dim)" />
                  }
                </Group>
              </Group>
              <Collapse in={showPreview}>
                <Code
                  block
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    fontSize: 12,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {payloadPreview}
                </Code>
              </Collapse>
            </Box>

            {/* Action buttons */}
            <Group justify="flex-end" gap="xs">
              <Button
                size="compact-sm"
                variant="light"
                color="gray"
                leftSection={<IconBookmark size={14} />}
                onClick={() => { setSaveName(''); setSaveModalOpen(true); }}
                disabled={!buildPayload()}
              >
                Save
              </Button>
              <Button
                size="compact-sm"
                color="rose"
                leftSection={<IconBolt size={14} />}
                onClick={handleFire}
                loading={fireEvent.isPending}
              >
                Fire Event
              </Button>
            </Group>

            {/* Response payload */}
            {lastResponse !== null && (
              <Box>
                <Group
                  justify="space-between"
                  mb={showResponse ? 'xs' : 0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowResponse(!showResponse)}
                >
                  <Group gap={6}>
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                      Response
                    </Text>
                    <Badge size="xs" variant="light" color="green">200</Badge>
                  </Group>
                  {showResponse
                    ? <IconChevronUp size={14} color="var(--ph-text-dim)" />
                    : <IconChevronDown size={14} color="var(--ph-text-dim)" />
                  }
                </Group>
                <Collapse in={showResponse}>
                  <Code
                    block
                    style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      fontSize: 12,
                      maxHeight: 300,
                      overflow: 'auto',
                    }}
                  >
                    {typeof lastResponse === 'string'
                      ? lastResponse
                      : JSON.stringify(lastResponse, null, 2)}
                  </Code>
                </Collapse>
              </Box>
            )}
          </Stack>
        </Card>
      ) : (
        /* Placeholder when no event is selected */
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
              <IconBolt size={24} color="var(--ph-accent)" />
            </Box>
            <Text fw={600} size="md">Select an event type</Text>
            <Text size="sm" c="dimmed">
              Choose from the dropdown above to configure and fire an event
            </Text>
          </Stack>
        </Card>
      )}
      {/* Save favorite modal */}
      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Favorite Event"
        centered
        size="sm"
        styles={{
          header: { background: 'var(--ph-surface-solid)', borderBottom: '1px solid var(--ph-border)' },
          body: { background: 'var(--ph-surface-solid)' },
          content: { background: 'var(--ph-surface-solid)' },
        }}
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="My favorite event"
            value={saveName}
            onChange={(e) => setSaveName(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="compact-sm"
              color="rose"
              leftSection={<IconBookmark size={14} />}
              disabled={!saveName.trim()}
              loading={saveEvent.isPending}
              onClick={() => {
                const payload = buildPayload();
                if (!payload) return;
                saveEvent.mutate(
                  { type: 'save_favorite', name: saveName.trim(), event: payload } as EventPayload,
                  {
                    onSuccess: () => {
                      notifications.show({ title: 'Saved', message: saveName, color: 'green' });
                      setSaveModalOpen(false);
                    },
                    onError: () =>
                      notifications.show({ title: 'Failed', message: 'Could not save event', color: 'red' }),
                  },
                );
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
