/**
 * Reusable inline event picker.
 *
 * Renders a compact event type selector + dynamic field form.
 * Returns the built event payload via onChange. Used by TaskCreator
 * for on_run / on_confirm / on_cancel hooks.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Stack,
  Select,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  Button,
  Divider,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useEventIntrospection } from '../../api/queries.ts';
import { parseDefinition, defaultForType, FieldInput } from './EventBuilder.tsx';
import type { EventDef } from '../../types/index.ts';

interface EventPickerProps {
  /** Current event payload (or null if none set) */
  value: Record<string, unknown> | null;
  /** Called when the event payload changes; null means cleared */
  onChange: (payload: Record<string, unknown> | null) => void;
  /** Optional label shown above the picker */
  label?: string;
  /** Optional description shown below the label */
  description?: string;
  /** Pre-fetched definitions to avoid redundant introspection calls */
  definitions?: EventDef[];
}

export function EventPicker({ value, onChange, label, description, definitions: propDefs }: EventPickerProps) {
  const introspect = useEventIntrospection();

  // Load definitions on mount if not provided via props
  useEffect(() => {
    if (!propDefs) {
      introspect.mutate(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const definitions: EventDef[] = useMemo(() => {
    if (propDefs) return propDefs;
    const raw = introspect.data ?? [];
    return raw.map(parseDefinition);
  }, [propDefs, introspect.data]);

  const selectedType = (value?.type as string) ?? '';
  const selectedDef = useMemo(
    () => definitions.find((d) => d.type === selectedType) ?? null,
    [definitions, selectedType],
  );

  /** When the user selects an event type, initialise field defaults */
  const handleSelectType = useCallback(
    (type: string | null) => {
      if (!type) {
        onChange(null);
        return;
      }
      const def = definitions.find((d) => d.type === type);
      if (def) {
        const init: Record<string, unknown> = { type };
        def.fields.forEach((f) => {
          init[f.name] = defaultForType(f.type);
        });
        onChange(init);
      } else {
        onChange({ type });
      }
    },
    [definitions, onChange],
  );

  /** Update a single field in the current event payload */
  const setField = useCallback(
    (name: string, fieldValue: unknown) => {
      if (!value) return;
      onChange({ ...value, [name]: fieldValue });
    },
    [value, onChange],
  );

  // Loading state (only when fetching our own definitions)
  if (!propDefs && introspect.isPending) {
    return (
      <Group gap="xs" py="xs">
        <Loader size="xs" color="var(--ph-accent)" />
        <Text size="xs" c="dimmed">Loading events...</Text>
      </Group>
    );
  }

  // Error state
  if (!propDefs && introspect.isError) {
    return (
      <Button
        variant="subtle"
        color="gray"
        size="xs"
        leftSection={<IconRefresh size={14} />}
        onClick={() => introspect.mutate(undefined)}
      >
        Retry loading events
      </Button>
    );
  }

  return (
    <Stack gap="xs">
      {label && (
        <div>
          <Text size="sm" fw={500}>{label}</Text>
          {description && <Text size="xs" c="dimmed">{description}</Text>}
        </div>
      )}

      <Select
        placeholder="Select event type..."
        data={[
          { value: '', label: '— none —' },
          ...definitions.map((d) => ({ value: d.type, label: d.type })),
        ]}
        value={selectedType || null}
        onChange={handleSelectType}
        searchable
        size="xs"
        clearable
        onClear={() => onChange(null)}
      />

      {selectedDef && selectedDef.fields.length > 0 && (
        <Card
          p="xs"
          withBorder
          style={{ borderColor: 'rgba(227, 74, 111, 0.15)', background: 'rgba(227, 74, 111, 0.02)' }}
        >
          <Stack gap="xs">
            <Group gap="xs">
              <Text size="xs" fw={600} c="var(--ph-accent)">{selectedDef.type}</Text>
              <Badge size="xs" variant="light" color="gray">
                {selectedDef.fields.length} field{selectedDef.fields.length !== 1 ? 's' : ''}
              </Badge>
            </Group>
            <Divider color="var(--ph-border)" />
            {selectedDef.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={value?.[field.name]}
                onChange={(v) => setField(field.name, v)}
                allDefs={definitions}
              />
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
