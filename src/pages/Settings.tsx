/**
 * Settings page.
 *
 * Uses the settings manifest (from screen manifest.json files) to render
 * typed fields: bool→Switch, options→Select, numeric→NumberInput, string→TextInput.
 * Panels are organized by screen/feature with proper labels and descriptions.
 *
 * After saving, triggers a configuration reload on the PiHome device so
 * changes take effect immediately (restarts services, notifies screens).
 *
 * Sensitive fields (tokens, passwords, api keys) are masked by default.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Stack,
  Group,
  Text,
  Card,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Button,
  Accordion,
  Box,
  Badge,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSettings,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconReload,
} from '@tabler/icons-react';
import {
  useSettings,
  useSettingsManifest,
  useUpdateSettings,
  useReloadSettings,
  type ManifestPanel,
  type ManifestField,
} from '../api/queries.ts';
import type { SettingsData } from '../types/index.ts';
import { SettingsLoader } from '../components/Loading/PageLoader.tsx';
import { APP_VERSION } from '../constants.ts';

/** Keys that likely contain sensitive values */
const SENSITIVE_PATTERNS = ['token', 'password', 'secret', 'api_key', 'access_code', 'cookie', 'csrf'];

function isSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((p) => lower.includes(p));
}

// ─── Typed field renderer ───────────────────────────────────────────

interface FieldRowProps {
  field: ManifestField;
  currentValue: string;
  editedValue: string | undefined;
  onEdit: (value: string) => void;
}

function FieldRow({ field, currentValue, editedValue, onEdit }: FieldRowProps) {
  const [revealed, setRevealed] = useState(false);
  const value = editedValue ?? currentValue;
  const isEdited = editedValue !== undefined;
  const sensitive = field.key ? isSensitive(field.key) : false;

  // ── Bool → Switch toggle ──
  if (field.type === 'bool') {
    const isOn = value === '1' || value === 'true' || value === 'True';
    return (
      <Box>
        <Group justify="space-between" wrap="nowrap">
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={500}>{field.title}</Text>
            {field.desc && <Text size="xs" c="dimmed">{field.desc}</Text>}
          </Box>
          <Switch
            checked={isOn}
            onChange={(e) => onEdit(e.currentTarget.checked ? '1' : '0')}
            color="rose"
            styles={isEdited ? {
              track: { borderColor: 'var(--ph-accent)' },
            } : {}}
          />
        </Group>
      </Box>
    );
  }

  // ── Options → Select dropdown ──
  if (field.type === 'options' && field.options) {
    return (
      <Box>
        <Select
          label={field.title}
          description={field.desc}
          data={field.options}
          value={value || null}
          onChange={(v) => v !== null && onEdit(v)}
          size="sm"
          styles={isEdited ? {
            input: { borderColor: 'var(--ph-accent)', background: 'rgba(227, 74, 111, 0.05)' },
          } : {}}
        />
      </Box>
    );
  }

  // ── Numeric → NumberInput ──
  if (field.type === 'numeric') {
    return (
      <Box>
        <NumberInput
          label={field.title}
          description={field.desc}
          value={value === '' ? '' : Number(value)}
          onChange={(v) => onEdit(String(v))}
          size="sm"
          styles={isEdited ? {
            input: { borderColor: 'var(--ph-accent)', background: 'rgba(227, 74, 111, 0.05)' },
          } : {}}
        />
      </Box>
    );
  }

  // ── String (default) → TextInput ──
  return (
    <Box>
      <TextInput
        label={field.title}
        description={field.desc}
        value={sensitive && !revealed ? '••••••••' : value}
        onChange={(e) => onEdit(e.currentTarget.value)}
        onFocus={() => { if (sensitive && !revealed) setRevealed(true); }}
        size="sm"
        styles={isEdited ? {
          input: { borderColor: 'var(--ph-accent)', background: 'rgba(227, 74, 111, 0.05)' },
        } : {}}
        rightSection={
          sensitive ? (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? <IconEyeOff size={14} /> : <IconEye size={14} />}
            </ActionIcon>
          ) : undefined
        }
      />
    </Box>
  );
}

// ─── Panel editor (one manifest panel = one accordion item) ─────────

interface PanelEditorProps {
  panel: ManifestPanel;
  settings: SettingsData;
}

function PanelEditor({ panel, settings }: PanelEditorProps) {
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const updateSettings = useUpdateSettings();
  const reloadSettings = useReloadSettings();

  // Reset edits when settings data refreshes
  useEffect(() => {
    setEdits({});
  }, [settings]);

  /** Get the current value from settings for a field */
  const getCurrentValue = (section?: string, key?: string): string => {
    if (!section || !key) return '';
    return settings[section]?.[key] ?? '';
  };

  /** Track an edit for a field */
  const handleEdit = (section: string, key: string, value: string) => {
    const currentVal = getCurrentValue(section, key);
    setEdits((prev) => {
      const next = { ...prev };
      if (value === currentVal) {
        // Revert: remove from edits
        if (next[section]) {
          const { [key]: _, ...rest } = next[section];
          if (Object.keys(rest).length === 0) delete next[section];
          else next[section] = rest;
        }
      } else {
        next[section] = { ...next[section], [key]: value };
      }
      return next;
    });
  };

  /** Count total pending edits across all sections */
  const editCount = Object.values(edits).reduce((sum, s) => sum + Object.keys(s).length, 0);
  const hasChanges = editCount > 0;

  /** Save all pending edits (may span multiple sections) then trigger reload */
  const handleSave = async () => {
    try {
      // Save each changed section
      for (const [section, values] of Object.entries(edits)) {
        await updateSettings.mutateAsync({ section, values });
      }
      // Trigger config reload so changes take effect on the device
      await reloadSettings.mutateAsync();
      notifications.show({
        title: 'Settings saved',
        message: 'Configuration reloaded on device',
        color: 'green',
      });
      setEdits({});
    } catch {
      notifications.show({
        title: 'Save failed',
        message: 'Could not save settings',
        color: 'red',
      });
    }
  };

  return (
    <Stack gap="sm">
      {panel.fields.map((field, i) => {
        // Title fields render as section dividers
        if (field.type === 'title') {
          return (
            <Divider
              key={`title-${i}`}
              label={field.title}
              labelPosition="left"
              mt={i > 0 ? 'xs' : 0}
              color="var(--ph-border)"
              styles={{
                label: {
                  color: 'var(--ph-accent)',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                },
              }}
            />
          );
        }

        // Editable fields
        if (!field.section || !field.key) return null;
        const editedValue = edits[field.section]?.[field.key];

        return (
          <FieldRow
            key={`${field.section}-${field.key}`}
            field={field}
            currentValue={getCurrentValue(field.section, field.key)}
            editedValue={editedValue}
            onEdit={(v) => handleEdit(field.section!, field.key!, v)}
          />
        );
      })}

      {/* Save / Discard bar */}
      {hasChanges && (
        <Group justify="flex-end" mt="xs">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => setEdits({})}
          >
            Discard
          </Button>
          <Button
            size="xs"
            color="rose"
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={handleSave}
            loading={updateSettings.isPending || reloadSettings.isPending}
          >
            Save & Apply ({editCount})
          </Button>
        </Group>
      )}
    </Stack>
  );
}

// ─── Settings page ──────────────────────────────────────────────────

export function Settings() {
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useSettings();
  const { data: manifest, isLoading: manifestLoading } = useSettingsManifest();
  const reloadSettings = useReloadSettings();

  const isLoading = settingsLoading || manifestLoading;

  /** Force-reload configuration on the device (without saving anything) */
  const handleForceReload = () => {
    reloadSettings.mutate(undefined, {
      onSuccess: () => {
        notifications.show({
          title: 'Reloaded',
          message: 'Configuration reloaded on device',
          color: 'green',
        });
      },
      onError: () => {
        notifications.show({
          title: 'Failed',
          message: 'Could not trigger reload',
          color: 'red',
        });
      },
    });
  };

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <IconSettings size={22} color="var(--ph-accent)" />
          <Text fw={600} size="lg" style={{ fontFamily: '"Outfit", sans-serif' }}>
            Settings
          </Text>
        </Group>
        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={handleForceReload}
            loading={reloadSettings.isPending}
            title="Reload configuration on device"
          >
            <IconReload size={18} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => refetchSettings()}
            title="Refresh settings"
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Text size="xs" c="dimmed">
        Changes are written to configuration and applied to PiHome immediately on save.
      </Text>

      {isLoading ? (
        <SettingsLoader />
      ) : manifest && settings ? (
        <Accordion
          variant="separated"
          radius="lg"
          styles={{
            item: { background: 'var(--ph-surface)', border: '1px solid var(--ph-border)' },
            control: { padding: '10px 16px' },
            content: { padding: '0 16px 16px' },
          }}
        >
          {manifest.map((panel) => {
            // Count editable fields (exclude title rows)
            const fieldCount = panel.fields.filter((f) => f.type !== 'title').length;
            return (
              <Accordion.Item key={panel.label} value={panel.label}>
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fw={500} size="sm">{panel.label}</Text>
                    <Badge variant="light" color="gray" size="xs">
                      {fieldCount} settings
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <PanelEditor panel={panel} settings={settings} />
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      ) : (
        <Card p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="sm">Could not load settings</Text>
        </Card>
      )}

      {/* Version info */}
      <Text size="xs" c="dimmed" ta="center" mt="lg">
        PiHome Web v{APP_VERSION}
      </Text>
    </Stack>
  );
}
