/**
 * React Query query/mutation hooks for the PiHome HTTP API.
 */
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
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

// ── Uploads ─────────────────────────────────────────────────────────

export interface UploadItem {
  name: string;
  url: string; // server-relative path, e.g. "/uploads/foo.png"
}

/** Read a File into a base64 string (without the data-URL prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface UploadsPage {
  uploads: UploadItem[];
  total: number;
  offset: number;
  limit: number;
}

export const UPLOADS_PAGE_SIZE = 24;
export const DEFAULT_ALBUM = 'Default';

export interface Album {
  name: string;
  count: number;
}

/** Fetch all albums (with image counts) and the active wallpaper album */
export function useAlbums() {
  return useQuery<{ albums: Album[]; active: string }>({
    queryKey: ['albums'],
    queryFn: async () => {
      const { data } = await apiClient.post('/', { type: 'list_albums' });
      const body = data as Record<string, unknown>;
      return {
        albums: (body?.albums ?? []) as Album[],
        active: (body?.active as string) ?? DEFAULT_ALBUM,
      };
    },
    staleTime: 10_000,
  });
}

/** Create a new album */
export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post('/', { type: 'create_album', name });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['albums'] }),
  });
}

/** Rename an album */
export function useRenameAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, newName }: { name: string; newName: string }) => {
      const { data } = await apiClient.post('/', { type: 'rename_album', name, new_name: newName });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['albums'] });
      qc.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

/** Delete an album and all images inside it */
export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await apiClient.post('/', { type: 'delete_album', name });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['albums'] });
      qc.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}

/** Fetch an album's images one page at a time.
 *  Pagination prevents the gallery from requesting hundreds of images at once,
 *  which would overload the Pi's single-threaded HTTP server.
 */
export function useUploads(album: string) {
  return useInfiniteQuery<UploadsPage>({
    queryKey: ['uploads', album],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data } = await apiClient.post('/', {
        type: 'list_uploads',
        album,
        offset: pageParam as number,
        limit: UPLOADS_PAGE_SIZE,
      });
      const body = data as Record<string, unknown>;
      return {
        uploads: (body?.uploads ?? []) as UploadItem[],
        total: (body?.total as number) ?? 0,
        offset: (body?.offset as number) ?? (pageParam as number),
        limit: (body?.limit as number) ?? UPLOADS_PAGE_SIZE,
      };
    },
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.limit;
      return next < lastPage.total ? next : undefined;
    },
    staleTime: 10_000,
  });
}

/** Upload a single image file into an album (base64 via the event pipeline) */
export function useUploadImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, album }: { file: File; album: string }) => {
      const base64 = await fileToBase64(file);
      const { data } = await apiClient.post('/', {
        type: 'upload_image',
        filename: file.name,
        album,
        data: base64,
      });
      return data;
    },
    onSuccess: (_data, { album }) => {
      qc.invalidateQueries({ queryKey: ['uploads', album] });
      qc.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

/** Delete an uploaded image from an album */
export function useDeleteUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ album, name }: { album: string; name: string }) => {
      const { data } = await apiClient.post('/', { type: 'delete_upload', album, name });
      return data;
    },
    onSuccess: (_data, { album }) => {
      qc.invalidateQueries({ queryKey: ['uploads', album] });
      qc.invalidateQueries({ queryKey: ['albums'] });
    },
  });
}

// ── Timers ──────────────────────────────────────────────────────────

/** Create a new timer */
export function useCreateTimer() {
  return useMutation({
    mutationFn: async ({ label, duration, on_complete }: { label: string; duration: number; on_complete?: Record<string, unknown> }) => {
      const payload: Record<string, unknown> = { type: 'timer', label, duration };
      if (on_complete) payload.on_complete = on_complete;
      const { data } = await apiClient.post('/', payload);
      return data;
    },
  });
}
