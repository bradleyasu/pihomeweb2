/**
 * Weather display card for the home screen.
 *
 * Shows temperature, humidity, wind speed, and a weather icon
 * based on the Tomorrow.io weather code.
 */
import { Card, Group, Stack, Text, Box, SimpleGrid } from '@mantine/core';
import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconCloudSnow,
  IconCloudStorm,
  IconCloudFog,
  IconMoon,
  IconDroplet,
  IconWind,
  IconTemperature,
} from '@tabler/icons-react';
import type { WeatherStatus } from '../../types/index.ts';

interface Props {
  weather: WeatherStatus;
}

/** Map Tomorrow.io weather codes to icons */
function getWeatherIcon(code: number) {
  if (code <= 1000) return IconSun;        // Clear
  if (code <= 1101) return IconCloud;       // Partly cloudy
  if (code <= 1102) return IconCloud;       // Mostly cloudy
  if (code <= 2100) return IconCloudFog;    // Fog
  if (code <= 4001) return IconCloudRain;   // Rain
  if (code <= 5101) return IconCloudSnow;   // Snow
  if (code <= 6201) return IconCloudRain;   // Freezing rain
  if (code <= 7102) return IconCloudSnow;   // Ice pellets
  if (code <= 8000) return IconCloudStorm;  // Thunderstorm
  return IconCloud;
}

function getWeatherLabel(code: number): string {
  if (code <= 1000) return 'Clear';
  if (code <= 1001) return 'Partly Cloudy';
  if (code <= 1102) return 'Mostly Cloudy';
  if (code <= 2100) return 'Foggy';
  if (code <= 4001) return 'Rainy';
  if (code <= 5101) return 'Snowy';
  if (code <= 6201) return 'Freezing Rain';
  if (code <= 7102) return 'Ice';
  if (code <= 8000) return 'Thunderstorm';
  return 'Cloudy';
}

export function WeatherCard({ weather }: Props) {
  const Icon = getWeatherIcon(weather.weather_code);
  const label = getWeatherLabel(weather.weather_code);

  return (
    <Card p="sm">
      <Group gap="sm" wrap="nowrap">
        {/* Large weather icon */}
        <Box
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'rgba(77, 171, 247, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={28} color="var(--ph-blue)" stroke={1.5} />
        </Box>

        <Stack gap={2} style={{ flex: 1 }}>
          {/* Temperature + label */}
          <Group gap={6} align="baseline">
            <Text fw={700} size="xl" style={{ lineHeight: 1 }}>
              {Math.round(weather.temperature)}°
            </Text>
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          </Group>

          {/* Secondary stats */}
          <Group gap="md">
            <Group gap={4}>
              <IconDroplet size={13} color="var(--ph-blue)" stroke={1.5} />
              <Text size="xs" c="dimmed">{Math.round(weather.humidity)}%</Text>
            </Group>
            <Group gap={4}>
              <IconWind size={13} color="var(--ph-text-dim)" stroke={1.5} />
              <Text size="xs" c="dimmed">{Math.round(weather.wind_speed)} mph</Text>
            </Group>
            {weather.uv_index > 0 && (
              <Group gap={4}>
                <IconSun size={13} color="var(--ph-accent)" stroke={1.5} />
                <Text size="xs" c="dimmed">UV {weather.uv_index}</Text>
              </Group>
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}
