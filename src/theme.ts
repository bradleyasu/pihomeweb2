/**
 * Mantine theme configuration for PiHome.
 *
 * Design direction: "Hearth" — warm, cozy dark UI with refined glass-morphism.
 * Warm charcoal (brown-tinted) backgrounds, clay/terracotta accent, warm-white
 * text, with sage / slate / brick / amber semantic states. Mirrors the PiHome
 * device app's warm dark theme.
 * Outfit for headings, DM Sans for body.
 */
import { createTheme, type MantineColorsTuple } from '@mantine/core';

/** Clay / terracotta accent palette built around #BC6240 (filled) / #DB8A63 (light) */
const clay: MantineColorsTuple = [
  '#fdf0e9',
  '#f6dccb',
  '#ecb89a',
  '#e2956c',
  '#db8a63', // light accent (text/icon highlights on dark)
  '#cf6f44',
  '#bf6038', // primary filled (≈ #BC6240)
  '#a5532f',
  '#8a4527',
  '#6f371e',
];

/** Warm charcoal surface ramp (brown-tinted, not blue-black) */
const surface: MantineColorsTuple = [
  '#ece7e0',
  '#d9d0c4',
  '#b5aa9a',
  '#8a7c68',
  '#5a5048',
  '#423a33',
  '#322e28', // raised surface
  '#2b2722', // header band
  '#221f1b', // page background
  '#1a1714',
];

export const theme = createTheme({
  primaryColor: 'clay',
  colors: {
    clay,
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
        bg: 'rgba(50, 46, 40, 0.6)',
        style: {
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245, 240, 232, 0.07)',
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
