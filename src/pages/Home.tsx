/**
 * Home page — the main dashboard.
 *
 * Displays clock/date, weather, now-playing, current wallpaper,
 * active timers, and the app launcher grid.
 */
import { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  Card,
  Image,
  Box,
  Anchor,
  Modal,
  Divider,
} from '@mantine/core';
import { IconClock, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { usePiHome } from '../providers/PiHomeProvider.tsx';
import { NowPlaying } from '../components/NowPlaying/NowPlaying.tsx';
import { WeatherCard } from '../components/Weather/WeatherCard.tsx';
import { TimerCard } from '../components/Timer/TimerCard.tsx';
import { TaskCard } from '../components/Task/TaskCard.tsx';
import { AppLauncher } from '../components/AppLauncher/AppLauncher.tsx';
import { HomeLoader } from '../components/Loading/PageLoader.tsx';
import { useAckTask } from '../api/queries.ts';
import { getApiBaseUrl } from '../constants.ts';

/** Live clock component with large display time */
function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Box style={{ textAlign: 'center' }}>
      <Text
        fw={300}
        style={{
          fontSize: 56,
          lineHeight: 1,
          fontFamily: '"Outfit", sans-serif',
          letterSpacing: -2,
        }}
      >
        {timeStr}
      </Text>
      <Text size="sm" c="dimmed" mt={4}>
        {dateStr}
      </Text>
    </Box>
  );
}

export function Home() {
  const { status } = usePiHome();
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const ackTask = useAckTask();

  if (!status) return <HomeLoader />;

  const activeTasks = status.tasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'PRE_IN_PROGRESS',
  );

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

  const wallpaperUrl = status.wallpaper.current
    ? `${getApiBaseUrl()}/wallpaper/${encodeURIComponent(status.wallpaper.current)}`
    : null;

  return (
    <Stack gap="md">
      {/* Clock */}
      <Clock />

      {/* Weather */}
      {status.weather && status.weather.temperature !== 0 && (
        <WeatherCard weather={status.weather} />
      )}

      {/* Now Playing */}
      {status.now_playing && (
        <NowPlaying nowPlaying={status.now_playing} />
      )}

      {/* Active timers (compact) */}
      {status.timers.length > 0 && (
        <Card p="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: 0.5 }}>
            Active Timers
          </Text>
          <Stack gap="xs">
            {status.timers.map((timer, i) => (
              <TimerCard key={`${timer.label}-${i}`} timer={timer} compact />
            ))}
          </Stack>
        </Card>
      )}

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <Card p="sm">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: 0.5 }}>
            Active Tasks
          </Text>
          <Stack gap="xs">
            {activeTasks.map((task) => (
              <TaskCard key={task.id} task={task} onAck={handleAck} />
            ))}
          </Stack>
        </Card>
      )}

      {/* Current wallpaper preview */}
      {wallpaperUrl && (
        <Card
          p={0}
          style={{ overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => setWallpaperOpen(true)}
        >
          <Box style={{ position: 'relative' }}>
            <Image
              src={wallpaperUrl}
              h={140}
              fit="cover"
              style={{ opacity: 0.8 }}
            />
            <Box
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '24px 12px 8px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              }}
            >
              <Group gap={6}>
                <IconPhoto size={14} color="var(--ph-text-dim)" />
                <Text size="xs" c="dimmed">Current Wallpaper</Text>
              </Group>
            </Box>
          </Box>
        </Card>
      )}

      {/* Wallpaper fullscreen modal */}
      <Modal
        opened={wallpaperOpen}
        onClose={() => setWallpaperOpen(false)}
        fullScreen
        padding={0}
        styles={{
          body: { background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
          content: { background: '#000' },
          header: { background: 'transparent', position: 'absolute', top: 0, right: 0, zIndex: 10 },
        }}
      >
        {wallpaperUrl && (
          <Image
            src={wallpaperUrl}
            fit="contain"
            style={{ maxHeight: '100vh', maxWidth: '100vw' }}
          />
        )}
      </Modal>

      {/* Divider before app launcher */}
      <Divider
        label="Apps"
        labelPosition="center"
        color="var(--ph-border)"
        styles={{ label: { color: 'var(--ph-text-dim)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 } }}
      />

      {/* App Launcher */}
      <AppLauncher screens={status.screens} />

      {/* Bottom spacer for scroll clearance */}
      <Box h={8} />
    </Stack>
  );
}
