/**
 * Now Playing widget for the home screen.
 *
 * Shows AirPlay/shairport metadata when music is playing.
 * Displays album art, track title, artist, and album with
 * a subtle glow effect and animated equalizer bars.
 */
import { useState } from 'react';
import { Card, Group, Stack, Text, Image, Box } from '@mantine/core';
import { IconMusic } from '@tabler/icons-react';
import type { NowPlayingStatus } from '../../types/index.ts';
import { getApiBaseUrl } from '../../constants.ts';

interface Props {
  nowPlaying: NowPlayingStatus;
}

/** Simple CSS equalizer bars animation */
function EqualizerBars() {
  return (
    <Group gap={2} align="flex-end" style={{ height: 16 }}>
      {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
        <Box
          key={i}
          style={{
            width: 3,
            borderRadius: 1,
            background: 'var(--ph-accent)',
            animation: `eqBounce 0.8s ease-in-out ${delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes eqBounce {
          0% { height: 4px; }
          100% { height: 16px; }
        }
      `}</style>
    </Group>
  );
}

export function NowPlaying({ nowPlaying }: Props) {
  const [artFailed, setArtFailed] = useState(false);

  if (!nowPlaying.is_playing || !nowPlaying.title) return null;

  const artworkUrl = nowPlaying.has_artwork && !artFailed
    ? `${getApiBaseUrl()}/airplay/artwork`
    : null;

  return (
    <Card
      p="sm"
      className="glow-accent"
      style={{
        background: 'linear-gradient(135deg, rgba(227, 74, 111, 0.08), rgba(30, 30, 46, 0.6))',
        border: '1px solid rgba(227, 74, 111, 0.15)',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        {/* Album art or music icon fallback */}
        <Box
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            overflow: 'hidden',
            background: 'rgba(227, 74, 111, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {artworkUrl ? (
            <Image
              src={artworkUrl}
              w={56}
              h={56}
              fit="cover"
              onError={() => setArtFailed(true)}
            />
          ) : (
            <IconMusic size={28} color="var(--ph-accent)" stroke={1.5} />
          )}
        </Box>

        {/* Track info */}
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={6} align="center">
            <EqualizerBars />
            <Text size="xs" c="var(--ph-accent)" fw={500} tt="uppercase" style={{ letterSpacing: 1 }}>
              Now Playing
            </Text>
          </Group>
          <Text fw={600} size="sm" lineClamp={1}>
            {nowPlaying.title}
          </Text>
          {nowPlaying.artist && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {nowPlaying.artist}
              {nowPlaying.album ? ` — ${nowPlaying.album}` : ''}
            </Text>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
