/**
 * Mantine theme configuration for PiHome.
 *
 * Design direction: "Obsidian" — dark, refined glass-morphism.
 * Deep charcoal backgrounds, rose accent, cool blue info states.
 * Outfit for headings, DM Sans for body.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** Rose accent palette built around #e34a6f */
const rose: MantineColorsTuple = [
  '#ffe4ec',
  '#ffc9d6',
  '#ffaabe',
  '#ff89a4',
  '#f46d8a',
  '#e34a6f',
  '#cd3f60',
  '#b53452',
  '#9c2944',
  '#7e1d34',
];

/** Deep surface colors for dark UI */
const surface: MantineColorsTuple = [
  '#e8e8ec',
  '#c4c4cc',
  '#9e9eab',
  '#78788a',
  '#52526a',
  '#2a2a3d',
  '#1e1e2e',
  '#16161f',
  '#0f0f17',
  '#0a0a12',
];

export const theme = createTheme({
  primaryColor: 'rose',
  colors: {
    rose,
    surface,
  },
  fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
  headings: {
    fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'lg',
  cursorType: 'pointer',
  components: {
    Card: {
      defaultProps: {
        bg: 'rgba(30, 30, 46, 0.6)',
        style: {
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'xl',
      },
    },
  },
});
