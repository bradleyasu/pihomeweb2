/**
 * App launcher grid for the home screen.
 *
 * Displays available PiHome screens/apps as tappable cards.
 * The currently active screen gets a highlighted border.
 */
import { SimpleGrid, Card, Text, Stack, Box, Image } from '@mantine/core';
import { IconAppWindow } from '@tabler/icons-react';
import type { ScreensStatus } from '../../types/index.ts';
import { usePiHome } from '../../providers/PiHomeProvider.tsx';
import { getApiBaseUrl } from '../../constants.ts';

/**
 * Resolve a screen icon path into a full URL.
 * Manifest paths look like "./screens/Home/icon.png" or "screens/Home/icon.png".
 * External URLs (http/https) are returned as-is.
 */
function resolveIconUrl(icon: string): string | null {
  if (!icon) return null;
  if (icon.startsWith('http')) return icon;
  // Strip leading "./" and ensure it starts with "screens/"
  const cleaned = icon.replace(/^\.\//, '');
  if (cleaned.startsWith('screens/')) {
    return `${getApiBaseUrl()}/${cleaned}`;
  }
  return null;
}

interface Props {
  screens: ScreensStatus;
}

export function AppLauncher({ screens }: Props) {
  const { sendPayload } = usePiHome();

  /** Parse screen entries — each is {screenId: {label, icon, ...}} */
  const entries = screens.screens
    .flatMap((entry) =>
      Object.entries(entry).map(([id, config]) => ({ id, ...config }))
    )
    .filter((s) => !s.hidden);

  const handleLaunch = (screenId: string) => {
    sendPayload({ type: 'app', app: screenId });
  };

  return (
    <SimpleGrid cols={3} spacing="xs">
      {entries.map((screen) => {
        const isActive = screen.id === screens.current;
        return (
          <Card
            key={screen.id}
            p="xs"
            onClick={() => handleLaunch(screen.id)}
            style={{
              cursor: 'pointer',
              textAlign: 'center',
              border: isActive
                ? '1px solid rgba(227, 74, 111, 0.4)'
                : '1px solid var(--ph-border)',
              background: isActive
                ? 'rgba(227, 74, 111, 0.08)'
                : 'var(--ph-surface)',
              transition: 'all 0.15s ease',
            }}
          >
            <Stack gap={4} align="center">
              {(() => {
                const iconUrl = resolveIconUrl(screen.icon);
                return iconUrl ? (
                  <Image
                    src={iconUrl}
                    w={28}
                    h={28}
                    fit="contain"
                    style={{ opacity: isActive ? 1 : 0.7 }}
                  />
                ) : (
                  <IconAppWindow
                    size={28}
                    stroke={1.5}
                    color={isActive ? 'var(--ph-accent)' : 'var(--ph-text-dim)'}
                  />
                );
              })()}
              <Text
                size="xs"
                fw={isActive ? 600 : 400}
                c={isActive ? 'var(--ph-accent)' : undefined}
                lineClamp={1}
              >
                {screen.label}
              </Text>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
