// @mixa-ai/ui — Sumi & Washi Design Token Definitions
// Sumi (墨) = Dark  |  Washi (和紙) = Light
// Color tokens vary per theme via CSS custom properties.
// Spacing, typography, and radii tokens are constant across themes.

import type { ThemeMode } from "@mixa-ai/types";

/** All semantic CSS variable names for color tokens (theme-dependent) */
export const themeTokens = {
  bgBase: "--mixa-bg-base",
  bgSurface: "--mixa-bg-surface",
  bgElevated: "--mixa-bg-elevated",
  bgActive: "--mixa-bg-active",
  bgHover: "--mixa-bg-hover",
  bgOverlay: "--mixa-bg-overlay",
  bgActiveAccent: "--mixa-bg-active-accent",

  borderDefault: "--mixa-border-default",
  borderSubtle: "--mixa-border-subtle",
  borderStrong: "--mixa-border-strong",
  borderFocus: "--mixa-border-focus",
  borderOverlay: "--mixa-border-overlay",

  textPrimary: "--mixa-text-primary",
  textSecondary: "--mixa-text-secondary",
  textTertiary: "--mixa-text-tertiary",
  textMuted: "--mixa-text-muted",
  textDisabled: "--mixa-text-disabled",
  textSubtle: "--mixa-text-subtle",
  textFaint: "--mixa-text-faint",

  accentPrimary: "--mixa-accent-primary",
  accentLight: "--mixa-accent-light",
  accentBlue: "--mixa-accent-blue",
  accentGreen: "--mixa-accent-green",
  accentWarm: "--mixa-accent-warm",
  accentRed: "--mixa-accent-red",

  shadowDropdown: "--mixa-shadow-dropdown",
  shadowOverlay: "--mixa-shadow-overlay",
  shadowFloat: "--mixa-shadow-float",
} as const;

/** Spacing scale (Ma — generous whitespace) */
export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

/** Typography scale */
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "14px",
    md: "14px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
  },
  lineHeight: {
    tight: "1.3",
    body: "1.6",
    relaxed: "1.75",
  },
} as const;

/** Border radius scale */
export const radii = {
  none: "0px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  xl: "12px",
  full: "9999px",
} as const;

/** Type for theme token keys */
export type ThemeToken = keyof typeof themeTokens;

/** CSS variable reference for use in inline styles */
export function token(key: ThemeToken): string {
  return `var(${themeTokens[key]})`;
}

/** Theme color values for a specific theme */
export interface ThemeColors {
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgActive: string;
  bgHover: string;
  bgOverlay: string;
  bgActiveAccent: string;

  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  borderFocus: string;
  borderOverlay: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  textDisabled: string;
  textSubtle: string;
  textFaint: string;

  accentPrimary: string;
  accentLight: string;
  accentBlue: string;
  accentGreen: string;
  accentWarm: string;
  accentRed: string;

  shadowDropdown: string;
  shadowOverlay: string;
  shadowFloat: string;
}

/** Sumi (墨) — Dark theme: warm charcoals, muted accents */
export const darkColors: ThemeColors = {
  bgBase: "#1a1a1e",
  bgSurface: "#222226",
  bgElevated: "#2a2a2e",
  bgActive: "#32323a",
  bgHover: "#28282e",
  bgOverlay: "#2a2a2e",
  bgActiveAccent: "#2a2a36",

  borderDefault: "#2e2e34",
  borderSubtle: "#26262c",
  borderStrong: "#36363e",
  borderFocus: "#4a4a54",
  borderOverlay: "#34343c",

  textPrimary: "#e8e4df",
  textSecondary: "#c4c0bb",
  textTertiary: "#a09c97",
  textMuted: "#8a8680",
  textDisabled: "#6a6662",
  textSubtle: "#5a5854",
  textFaint: "#4a4844",

  accentPrimary: "#8b8ec4",
  accentLight: "#a0a3d4",
  accentBlue: "#7b9ec8",
  accentGreen: "#7d9b85",
  accentWarm: "#c4956a",
  accentRed: "#b87070",

  shadowDropdown: "0 8px 24px rgba(0,0,0,0.5)",
  shadowOverlay: "0 8px 24px rgba(0,0,0,0.5)",
  shadowFloat: "0 2px 8px rgba(0,0,0,0.3)",
};

/** Washi (和紙) — Light theme: warm parchment, deeper accents */
export const lightColors: ThemeColors = {
  bgBase: "#f5f2ed",
  bgSurface: "#ebe7e1",
  bgElevated: "#ffffff",
  bgActive: "#e0dbd4",
  bgHover: "#eee9e3",
  bgOverlay: "#ffffff",
  bgActiveAccent: "#e4e4f0",

  borderDefault: "#ddd8d2",
  borderSubtle: "#e8e3dd",
  borderStrong: "#d0cbc5",
  borderFocus: "#b0aaa4",
  borderOverlay: "#d4cfc9",

  textPrimary: "#2c2a27",
  textSecondary: "#5c5955",
  textTertiary: "#6e6b67",
  textMuted: "#8a8580",
  textDisabled: "#aaa5a0",
  textSubtle: "#c4bfb9",
  textFaint: "#d8d3cd",

  accentPrimary: "#5c5f99",
  accentLight: "#4a4d85",
  accentBlue: "#4a7098",
  accentGreen: "#4a7a55",
  accentWarm: "#a07040",
  accentRed: "#995555",

  shadowDropdown: "0 8px 24px rgba(0,0,0,0.12)",
  shadowOverlay: "0 8px 24px rgba(0,0,0,0.12)",
  shadowFloat: "0 2px 8px rgba(0,0,0,0.08)",
};

/** Get colors for a resolved theme mode (not "system") */
export function getColorsForTheme(mode: Exclude<ThemeMode, "system">): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

/** Preset accent colors — muted palette matching the Ma aesthetic */
export const accentPresets = [
  { name: "Indigo", value: "#8b8ec4" },
  { name: "Blue", value: "#7b9ec8" },
  { name: "Sage", value: "#7d9b85" },
  { name: "Warm", value: "#c4956a" },
  { name: "Rose", value: "#b87070" },
  { name: "Lavender", value: "#a08cc4" },
  { name: "Teal", value: "#6a9e9e" },
  { name: "Slate", value: "#8a8e9c" },
] as const;

/** Generate a lighter variant of an accent color for hover states */
export function accentToLight(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (c: number): number => Math.min(255, Math.round(c + (255 - c) * 0.3));
  const lr = lighten(r).toString(16).padStart(2, "0");
  const lg = lighten(g).toString(16).padStart(2, "0");
  const lb = lighten(b).toString(16).padStart(2, "0");
  return `#${lr}${lg}${lb}`;
}

/** Validate a hex color string (e.g. "#8b8ec4") */
export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Theme-aware chart color palettes — muted tones for long-duration comfort */
export const chartPalette = {
  dark: [
    "#8b8ec4",
    "#7b9ec8",
    "#6a9e9e",
    "#7d9b85",
    "#c4956a",
    "#b87070",
    "#a08cc4",
    "#c48ba0",
    "#8a8e9c",
    "#a0956a",
  ],
  light: [
    "#5c5f99",
    "#4a7098",
    "#3a7a7a",
    "#4a7a55",
    "#a07040",
    "#995555",
    "#7a5f99",
    "#994a70",
    "#6a6e7c",
    "#7a7040",
  ],
} as const;

/** Get chart palette for the resolved theme mode */
export function getChartPalette(mode: Exclude<ThemeMode, "system">): readonly string[] {
  return chartPalette[mode];
}
