/**
 * Uploads page.
 *
 * Organize your own images into albums, preview them, and pick which album the
 * "My Uploads" wallpaper source rotates through. Upload, delete images, and
 * create / rename / delete albums — all from the device's web client.
 */
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Stack,
  Group,
  Text,
  Button,
  Card,
  Box,
  SimpleGrid,
  ActionIcon,
  Image,
  Center,
  Select,
  Badge,
  Modal,
  TextInput,
  Tooltip,
  Progress,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPhotoUp,
  IconTrash,
  IconWallpaper,
  IconPhoto,
  IconFolderPlus,
  IconPencil,
  IconCopy,
} from '@tabler/icons-react';
import {
  useAlbums,
  useUploads,
  useUploadImage,
  useDeleteUpload,
  useCreateAlbum,
  useRenameAlbum,
  useDeleteAlbum,
  useUpdateSettings,
  useReloadSettings,
  DEFAULT_ALBUM,
} from '../api/queries.ts';
import { getApiBaseUrl } from '../constants.ts';

export function Uploads() {
  const { data: albumData } = useAlbums();
  const albums = albumData?.albums ?? [];
  const activeAlbum = albumData?.active ?? DEFAULT_ALBUM;

  // The user's explicit pick (null until they choose one). The effective album
  // is *derived* during render so we never store stale state or sync via an
  // effect — if the pick is gone (album deleted/renamed), fall back to the
  // active album, then the first album, then Default.
  const [picked, setPicked] = useState<string | null>(null);
  const album =
    picked && albums.some((a) => a.name === picked)
      ? picked
      : albums.some((a) => a.name === activeAlbum)
        ? activeAlbum
        : albums[0]?.name ?? DEFAULT_ALBUM;

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useUploads(album);
  const uploads = data?.pages.flatMap((p) => p.uploads) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const uploadImage = useUploadImage();
  const deleteUpload = useDeleteUpload();
  const createAlbum = useCreateAlbum();
  const renameAlbum = useRenameAlbum();
  const deleteAlbum = useDeleteAlbum();
  const updateSettings = useUpdateSettings();
  const reloadSettings = useReloadSettings();

  const qc = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Multi-image upload progress: { done, total } while uploading, else null.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Name of the image currently shown in the fullscreen preview, else null.
  const [previewName, setPreviewName] = useState<string | null>(null);
  // Last-resort manual-copy fallback: a URL to show in a selectable field when
  // the clipboard API is unavailable (the app is served over plain HTTP).
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);

  const imageUrl = (name: string) =>
    `${getApiBaseUrl()}/uploads/${encodeURIComponent(album)}/${encodeURIComponent(name)}`;

  // Copy an image's absolute URL so it can be pasted into image-capable events.
  // navigator.clipboard only works in a secure context (HTTPS/localhost); this
  // app is served over plain HTTP, so fall back to execCommand, then to a
  // manual-copy modal as a final resort.
  const copyUrl = async (name: string) => {
    const url = imageUrl(name);
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        copied = false;
      }
    }
    if (copied) {
      notifications.show({ title: 'URL copied', message: url, color: 'green' });
    } else {
      setManualCopyUrl(url);
    }
  };

  const [createOpened, createModal] = useDisclosure(false);
  const [renameOpened, renameModal] = useDisclosure(false);
  const [deleteOpened, deleteModal] = useDisclosure(false);
  const [albumNameInput, setAlbumNameInput] = useState('');

  const isDefault = album === DEFAULT_ALBUM;
  const selectedCount = albums.find((a) => a.name === album)?.count ?? 0;

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      notifications.show({ title: 'Skipped', message: 'No image files selected', color: 'yellow' });
      return;
    }
    setBusy(true);
    setProgress({ done: 0, total: files.length });
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadImage.mutateAsync({ file: files[i], album });
        ok += 1;
      } catch {
        notifications.show({ title: 'Upload failed', message: files[i].name, color: 'red' });
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setBusy(false);
    setProgress(null);
    if (ok > 0) {
      notifications.show({
        title: 'Uploaded',
        message: `${ok} image${ok === 1 ? '' : 's'} added to ${album}`,
        color: 'green',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteImage = async (name: string) => {
    try {
      await deleteUpload.mutateAsync({ album, name });
      notifications.show({ title: 'Deleted', message: name, color: 'gray' });
    } catch {
      notifications.show({ title: 'Failed', message: 'Could not delete image', color: 'red' });
    }
  };

  const handleSetAsWallpaper = async () => {
    try {
      await updateSettings.mutateAsync({
        section: 'wallpaper',
        values: { source: 'My Uploads', uploads_album: album },
      });
      await reloadSettings.mutateAsync();
      // Refresh albums so the "Active" badge reflects the new active album
      // immediately instead of only after a manual page reload.
      qc.invalidateQueries({ queryKey: ['albums'] });
      notifications.show({
        title: 'Wallpaper updated',
        message: `Now rotating through "${album}"`,
        color: 'green',
      });
    } catch {
      notifications.show({ title: 'Failed', message: 'Could not set wallpaper source', color: 'red' });
    }
  };

  const handleCreateAlbum = async () => {
    const name = albumNameInput.trim();
    if (!name) return;
    try {
      const res = await createAlbum.mutateAsync(name);
      const created = (res as { name?: string })?.name ?? name;
      setPicked(created);
      createModal.close();
      setAlbumNameInput('');
      notifications.show({ title: 'Album created', message: created, color: 'green' });
    } catch {
      notifications.show({ title: 'Failed', message: 'Could not create album', color: 'red' });
    }
  };

  const handleRenameAlbum = async () => {
    const newName = albumNameInput.trim();
    if (!newName || isDefault) return;
    try {
      const res = await renameAlbum.mutateAsync({ name: album, newName });
      const renamed = (res as { name?: string })?.name ?? newName;
      setPicked(renamed);
      renameModal.close();
      notifications.show({ title: 'Album renamed', message: renamed, color: 'green' });
    } catch {
      notifications.show({ title: 'Failed', message: 'Could not rename album', color: 'red' });
    }
  };

  const handleDeleteAlbum = async () => {
    if (isDefault) return;
    try {
      await deleteAlbum.mutateAsync(album);
      deleteModal.close();
      setPicked(DEFAULT_ALBUM);
      notifications.show({ title: 'Album deleted', message: album, color: 'gray' });
    } catch {
      notifications.show({ title: 'Failed', message: 'Could not delete album', color: 'red' });
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap={8}>
          <IconPhotoUp size={22} color="var(--ph-accent)" />
          <Text fw={600} size="lg">Uploads</Text>
        </Group>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconWallpaper size={16} />}
          onClick={handleSetAsWallpaper}
          loading={updateSettings.isPending || reloadSettings.isPending}
          disabled={selectedCount === 0}
        >
          Use as Wallpaper
        </Button>
      </Group>

      {/* Album selector + management */}
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          label="Album"
          data={albums.map((a) => ({ value: a.name, label: `${a.name} (${a.count})` }))}
          value={album}
          onChange={(v) => v && setPicked(v)}
          allowDeselect={false}
          style={{ flex: 1 }}
          rightSection={album === activeAlbum ? <Badge size="xs" color="green">Active</Badge> : null}
          rightSectionWidth={album === activeAlbum ? 64 : undefined}
        />
        <Tooltip label="New album">
          <ActionIcon variant="light" size="lg" onClick={() => { setAlbumNameInput(''); createModal.open(); }}>
            <IconFolderPlus size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isDefault ? 'Default album cannot be renamed' : 'Rename album'}>
          <ActionIcon
            variant="light"
            size="lg"
            disabled={isDefault}
            onClick={() => { setAlbumNameInput(album); renameModal.open(); }}
          >
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isDefault ? 'Default album cannot be deleted' : 'Delete album'}>
          <ActionIcon variant="light" color="red" size="lg" disabled={isDefault} onClick={deleteModal.open}>
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Hidden native file input driven by the button below */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        leftSection={<IconPhotoUp size={18} />}
        onClick={() => fileInputRef.current?.click()}
        loading={busy}
      >
        Upload to {album}
      </Button>

      {progress && progress.total > 1 && (
        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Uploading to {album}...</Text>
            <Text size="xs" c="dimmed">{progress.done} of {progress.total}</Text>
          </Group>
          <Progress
            value={(progress.done / progress.total) * 100}
            size="sm"
            radius="xl"
            transitionDuration={200}
            animated={progress.done < progress.total}
          />
        </Stack>
      )}

      {isLoading ? (
        <Center py="xl"><Text c="dimmed" size="sm">Loading...</Text></Center>
      ) : uploads.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap={6}>
            <IconPhoto size={36} color="var(--ph-text-dim)" />
            <Text c="dimmed" size="sm">No images in this album</Text>
          </Stack>
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            {uploads.map((item) => (
              <Card key={item.name} p={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
                <Box style={{ position: 'relative' }}>
                  <Image
                    src={imageUrl(item.name)}
                    alt={item.name}
                    height={120}
                    fit="cover"
                    loading="lazy"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setPreviewName(item.name)}
                  />
                  <Tooltip label="Copy image URL">
                    <ActionIcon
                      variant="filled"
                      color="dark"
                      size="sm"
                      radius="xl"
                      style={{ position: 'absolute', top: 6, left: 6 }}
                      onClick={() => copyUrl(item.name)}
                    >
                      <IconCopy size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    radius="xl"
                    style={{ position: 'absolute', top: 6, right: 6 }}
                    onClick={() => handleDeleteImage(item.name)}
                    loading={deleteUpload.isPending && deleteUpload.variables?.name === item.name}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Box>
              </Card>
            ))}
          </SimpleGrid>

          {hasNextPage && (
            <Center>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load more ({uploads.length} of {total})
              </Button>
            </Center>
          )}
        </>
      )}

      {/* Fullscreen image preview (mirrors the Home wallpaper preview) */}
      <Modal
        opened={previewName !== null}
        onClose={() => setPreviewName(null)}
        fullScreen
        padding={0}
        styles={{
          body: { background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
          content: { background: '#000' },
          header: { background: 'transparent', position: 'absolute', top: 0, right: 0, zIndex: 10 },
        }}
      >
        {previewName && (
          <>
            <Image
              src={imageUrl(previewName)}
              alt={previewName}
              fit="contain"
              style={{ maxHeight: '100vh', maxWidth: '100vw' }}
            />
            <Button
              variant="white"
              size="xs"
              leftSection={<IconCopy size={16} />}
              onClick={() => copyUrl(previewName)}
              style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}
            >
              Copy URL
            </Button>
          </>
        )}
      </Modal>

      {/* Manual copy fallback (clipboard API blocked on plain HTTP) */}
      <Modal
        opened={manualCopyUrl !== null}
        onClose={() => setManualCopyUrl(null)}
        title="Copy image URL"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Select the URL below and copy it, then paste it into an event's image field.
          </Text>
          <TextInput
            value={manualCopyUrl ?? ''}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setManualCopyUrl(null)}>Close</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Create album modal */}
      <Modal opened={createOpened} onClose={createModal.close} title="New album" centered>
        <Stack>
          <TextInput
            label="Album name"
            placeholder="e.g. Vacation"
            value={albumNameInput}
            onChange={(e) => setAlbumNameInput(e.currentTarget.value)}
            data-autofocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAlbum()}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={createModal.close}>Cancel</Button>
            <Button onClick={handleCreateAlbum} loading={createAlbum.isPending}>Create</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Rename album modal */}
      <Modal opened={renameOpened} onClose={renameModal.close} title="Rename album" centered>
        <Stack>
          <TextInput
            label="New name"
            value={albumNameInput}
            onChange={(e) => setAlbumNameInput(e.currentTarget.value)}
            data-autofocus
            onKeyDown={(e) => e.key === 'Enter' && handleRenameAlbum()}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={renameModal.close}>Cancel</Button>
            <Button onClick={handleRenameAlbum} loading={renameAlbum.isPending}>Rename</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete album confirm modal */}
      <Modal opened={deleteOpened} onClose={deleteModal.close} title="Delete album" centered>
        <Stack>
          <Text size="sm">
            Delete "{album}" ({selectedCount} image{selectedCount === 1 ? '' : 's'})? This
            permanently removes the album and its images.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={deleteModal.close}>Cancel</Button>
            <Button color="red" onClick={handleDeleteAlbum} loading={deleteAlbum.isPending}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
