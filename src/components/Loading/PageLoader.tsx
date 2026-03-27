/**
 * Branded page loading state.
 *
 * Replaces generic Mantine Skeletons with a sleek shimmer animation
 * that matches the glass-morphism aesthetic. Each page variant hints
 * at the layout the user will see once data arrives.
 */
import { Stack, Group, Box } from '@mantine/core';

// ─── Shimmer primitive ──────────────────────────────────────────────

interface ShimmerProps {
  /** Width — number (px) or CSS string. Defaults to '100%'. */
  w?: number | string;
  /** Height in px */
  h: number;
  /** Border radius in px. Defaults to 12. */
  r?: number;
  /** Whether to render as a circle */
  circle?: boolean;
  /** Animation delay in ms for stagger effect */
  delay?: number;
}

function Shimmer({ w = '100%', h, r = 12, circle, delay = 0 }: ShimmerProps) {
  const size = circle ? h : undefined;
  return (
    <Box
      style={{
        width: circle ? size : w,
        height: h,
        minWidth: circle ? size : undefined,
        borderRadius: circle ? '50%' : r,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%)',
        backgroundSize: '400% 100%',
        animation: `shimmer 1.8s ease-in-out infinite`,
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

// ─── Page-specific loading layouts ──────────────────────────────────

/** Home page: clock area, weather row, now-playing, wallpaper, app grid */
export function HomeLoader() {
  return (
    <Stack gap="md" className="page-enter">
      {/* Clock / date area */}
      <Stack gap={6} align="center" py="sm">
        <Shimmer w={180} h={40} r={8} />
        <Shimmer w={120} h={16} r={6} delay={80} />
      </Stack>

      {/* Weather card */}
      <Box style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: 16, background: 'rgba(30,30,46,0.4)' }}>
        <Group gap="md" wrap="nowrap">
          <Shimmer w={48} h={48} circle delay={120} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Shimmer w="60%" h={14} r={6} delay={160} />
            <Shimmer w="40%" h={12} r={6} delay={200} />
          </Stack>
        </Group>
      </Box>

      {/* Now playing */}
      <Box style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: 16, background: 'rgba(30,30,46,0.4)' }}>
        <Group gap="md" wrap="nowrap">
          <Shimmer w={56} h={56} r={10} delay={240} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Shimmer w="70%" h={14} r={6} delay={280} />
            <Shimmer w="50%" h={12} r={6} delay={320} />
            <Shimmer w="30%" h={10} r={6} delay={360} />
          </Stack>
        </Group>
      </Box>

      {/* App launcher grid */}
      <Group gap="sm" wrap="wrap">
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} style={{ flex: '1 1 calc(50% - 8px)', minWidth: 0 }}>
            <Box style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)', padding: 14, background: 'rgba(30,30,46,0.4)' }}>
              <Group gap="sm" wrap="nowrap">
                <Shimmer w={36} h={36} circle delay={400 + i * 60} />
                <Shimmer w="60%" h={12} r={6} delay={420 + i * 60} />
              </Group>
            </Box>
          </Box>
        ))}
      </Group>
    </Stack>
  );
}

/** Tasks page: header bar + task cards */
export function TasksLoader() {
  return (
    <Stack gap="md" className="page-enter">
      {/* Header row */}
      <Group justify="space-between">
        <Shimmer w={100} h={24} r={8} />
        <Shimmer w={90} h={30} r={16} delay={60} />
      </Group>

      {/* Filter / segmented control */}
      <Shimmer w="100%" h={36} r={20} delay={100} />

      {/* Task cards */}
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: 16, background: 'rgba(30,30,46,0.4)' }}
        >
          <Stack gap={8}>
            <Group justify="space-between" wrap="nowrap">
              <Shimmer w="55%" h={14} r={6} delay={160 + i * 80} />
              <Shimmer w={48} h={20} r={10} delay={180 + i * 80} />
            </Group>
            <Shimmer w="80%" h={12} r={6} delay={200 + i * 80} />
            <Group gap="xs">
              <Shimmer w={60} h={10} r={6} delay={220 + i * 80} />
              <Shimmer w={60} h={10} r={6} delay={240 + i * 80} />
            </Group>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

/** Timers page: header + create form + timer cards */
export function TimersLoader() {
  return (
    <Stack gap="md" className="page-enter">
      {/* Header */}
      <Shimmer w={110} h={24} r={8} />

      {/* Create form */}
      <Box style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: 16, background: 'rgba(30,30,46,0.4)' }}>
        <Stack gap="sm">
          <Shimmer w="100%" h={36} r={8} delay={80} />
          <Group gap="sm" wrap="nowrap">
            <Shimmer w="100%" h={36} r={8} delay={120} />
            <Shimmer w={100} h={36} r={20} delay={160} />
          </Group>
        </Stack>
      </Box>

      {/* Timer card */}
      <Box style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)', padding: 16, background: 'rgba(30,30,46,0.4)' }}>
        <Group gap="md" wrap="nowrap">
          <Shimmer w={64} h={64} circle delay={200} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Shimmer w="50%" h={16} r={6} delay={240} />
            <Shimmer w={100} h={28} r={8} delay={280} />
            <Shimmer w={70} h={10} r={6} delay={320} />
          </Stack>
        </Group>
      </Box>
    </Stack>
  );
}

/** Settings page: header + accordion items */
export function SettingsLoader() {
  return (
    <Stack gap="md" className="page-enter">
      {/* Header row */}
      <Group justify="space-between">
        <Shimmer w={110} h={24} r={8} />
        <Group gap={4}>
          <Shimmer w={32} h={32} circle delay={60} />
          <Shimmer w={32} h={32} circle delay={100} />
        </Group>
      </Group>

      <Shimmer w="80%" h={12} r={6} delay={120} />

      {/* Accordion items */}
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.04)',
            padding: '14px 18px',
            background: 'rgba(30,30,46,0.4)',
          }}
        >
          <Group justify="space-between" wrap="nowrap">
            <Group gap="xs">
              <Shimmer w={120 + i * 20} h={14} r={6} delay={180 + i * 70} />
              <Shimmer w={50} h={18} r={10} delay={200 + i * 70} />
            </Group>
            <Shimmer w={20} h={20} r={4} delay={220 + i * 70} />
          </Group>
        </Box>
      ))}
    </Stack>
  );
}
