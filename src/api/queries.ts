/**
 * React Query query/mutation hooks for the PiHome HTTP API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client.ts';
import type { SettingsData, EventPayload, RawEventDef } from '../types/index.ts';

// ── Settings ───────────────────────────────────────────────────────

/** Fetch all settings sections */
export function useSettings() {
  return useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<SettingsData>('/settings');
      return data;
    },
    staleTime: 30_000,
  });
}

/** Fetch a single settings section */
export function useSettingsSection(section: string) {
  return useQuery<Record<string, string>>({
    queryKey: ['settings', section],
    queryFn: async () => {
      const { data } = await apiClient.get<Record<string, string>>(`/settings/${section}`);
      return data;
    },
    enabled: !!section,
    staleTime: 30_000,
  });
}

/** Update keys in a settings section */
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, values }: { section: string; values: Record<string, string> }) => {
      const { data } = await apiClient.put(`/settings/${section}`, values);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

/** Settings manifest field definition (from screen manifest.json files) */
export interface ManifestField {
  type: 'title' | 'string' | 'numeric' | 'bool' | 'options';
  title: string;
  desc?: string;
  section?: string;
  key?: string;
  options?: string[];
}

/** A settings panel with label, sort order, and field definitions */
export interface ManifestPanel {
  label: string;
  sortIndex: number;
  fields: ManifestField[];
}

/** Fetch the combined settings manifest (field types, labels, options) */
export function useSettingsManifest() {
  return useQuery<ManifestPanel[]>({
    queryKey: ['settings-manifest'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ panels: ManifestPanel[] }>('/settings/manifest');
      return data.panels;
    },
    staleTime: 5 * 60_000, // manifest changes rarely
  });
}

/** Trigger a full config reload on the PiHome device (restarts services, notifies screens) */
export function useReloadSettings() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/settings/reload');
      return data;
    },
  });
}

// ── Events ─────────────────────────────────────────────────────────

/** Fire an arbitrary event via HTTP POST */
export function useFireEvent() {
  return useMutation({
    mutationFn: async (payload: EventPayload) => {
      const { data } = await apiClient.post('/', payload);
      return data;
    },
  });
}

/** Introspect available event types.
 *  Returns the raw definitions array from the API response body.
 *  Each definition is: { type: "event_name", field: { type, required, description }, ... }
 */
export function useEventIntrospection() {
  return useMutation({
    mutationFn: async (eventType?: string) => {
      const payload: EventPayload = { type: 'introspect' };
      if (eventType) payload.event = eventType;
      const { data } = await apiClient.post('/', payload);
      // The API wraps definitions in { data: { definitions: [...] } } or { definitions: [...] }
      const body = data as Record<string, unknown>;
      const defs = (body?.definitions
        ?? (body?.data as Record<string, unknown>)?.definitions
        ?? []) as RawEventDef[];
      return defs;
    },
  });
}

// ── Favorite Events ───────────────────────────────────────────────

/** Fetch saved favorite events */
export function useFavoriteEvents() {
  return useQuery<Record<string, unknown>[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await apiClient.post('/', { type: 'get_favorites' });
      const body = data as Record<string, unknown>;
      const favs = (body?.favorites ?? {}) as Record<string, Record<string, unknown>>;
      return Object.entries(favs).map(([name, event]) => ({ name, event }));
    },
    staleTime: 10_000,
  });
}

/** Delete a saved favorite event by name */
export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post('/', { type: 'delete_favorite', name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/** Save (create or update) a favorite event */
export function useSaveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, event }: { name: string; event: Record<string, unknown> }) => {
      const { data } = await apiClient.post('/', { type: 'save_favorite', name, event });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

// ── AirPlay Listeners ─────────────────────────────────────────────

export interface AirPlayListener {
  id: string;
  trigger: 'on_start' | 'on_stop';
  action: EventPayload;
}

/** Fetch all AirPlay react listeners */
export function useAirPlayListeners() {
  return useQuery<AirPlayListener[]>({
    queryKey: ['airplay-listeners'],
    queryFn: async () => {
      const { data } = await apiClient.post('/', { type: 'get_airplay_react' });
      const body = data as Record<string, unknown>;
      const listeners = (body?.listeners ?? {}) as Record<string, { trigger: string; action: EventPayload }>;
      return Object.entries(listeners).map(([id, l]) => ({
        id,
        trigger: l.trigger as 'on_start' | 'on_stop',
        action: l.action,
      }));
    },
    staleTime: 10_000,
  });
}

/** Add a new AirPlay react listener */
export function useAddAirPlayListener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trigger, event }: { trigger: string; event: Record<string, unknown> }) => {
      const { data } = await apiClient.post('/', { type: 'airplay_react', trigger, event });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airplay-listeners'] });
    },
  });
}

/** Remove an AirPlay react listener by id */
export function useRemoveAirPlayListener() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post('/', { type: 'remove_airplay_react', id });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['airplay-listeners'] });
    },
  });
}

// ── Tasks ──────────────────────────────────────────────────────────

/** Create a new task */
export function useCreateTask() {
  return useMutation({
    mutationFn: async (task: Record<string, unknown>) => {
      const { data } = await apiClient.post('/', { type: 'task', ...task });
      return data;
    },
  });
}

/** Delete a task by id */
export function useDeleteTask() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await apiClient.post('/', { type: 'delete', entity: 'task', id: taskId });
      return data;
    },
  });
}

/** Acknowledge (confirm or cancel) the active task */
export function useAckTask() {
  return useMutation({
    mutationFn: async (confirm: boolean) => {
      const { data } = await apiClient.post('/', { type: 'acktask', confirm });
      return data;
    },
  });
}

// ── Timers ──────────────────────────────────────────────────────────

/** Create a new timer */
export function useCreateTimer() {
  return useMutation({
    mutationFn: async ({ label, duration }: { label: string; duration: number }) => {
      const { data } = await apiClient.post('/', { type: 'timer', label, duration });
      return data;
    },
  });
}
