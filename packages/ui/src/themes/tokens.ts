// @mixa-ai/ui — Theme token definitions
// These define the semantic design tokens used throughout the app.
// Color tokens vary per theme (dark/light) via CSS custom properties.
// Spacing, typography, and radii tokens are constant across themes.

import type { ThemeMode } from "@mixa-ai/types";

/** All semantic CSS variable names for color tokens (theme-dependent) */
export const themeTokens = {
  // Backgrounds
  bgBase: "--mixa-bg-base",
  bgSurface: "--mixa-bg-surface",
  bgElevated: "--mixa-bg-elevated",
  bgActive: "--mixa-bg-active",
  bgHover: "--mixa-bg-hover",
  bgOverlay: "--mixa-bg-overlay",
  bgActiveAccent: "--mixa-bg-active-accent",

  // Borders
  borderDefault: "--mixa-border-default",
  borderSubtle: "--mixa-border-subtle",
  borderStrong: "--mixa-border-strong",
  borderFocus: "--mixa-border-focus",
  borderOverlay: "--mixa-border-overlay",

  // Text
  textPrimary: "--mixa-text-primary",
  textSecondary: "--mixa-text-secondary",
  textTertiary: "--mixa-text-tertiary",
  textMuted: "--mixa-text-muted",
  textDisabled: "--mixa-text-disabled",
  textSubtle: "--mixa-text-subtle",
  textFaint: "--mixa-text-faint",

  // Accent (user-configurable)
  accentPrimary: "--mixa-accent-primary",
  accentLight: "--mixa-accent-light",

  // Functional accent colors (fixed)
  accentBlue: "--mixa-accent-blue",
  accentGreen: "--mixa-accent-green",

  // Shadows
  shadowDropdown: "--mixa-shadow-dropdown",
  shadowOverlay: "--mixa-shadow-overlay",
  shadowFloat: "--mixa-shadow-float",
} as const;

/** Spacing scale (in px) — consistent across themes */
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

/** Typography scale — consistent across themes */
export const typography = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
  },
  fontSize: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "24px",
    "3xl": "30px",
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeight: {
    tight: "1.2",
    normal: "1.5",
    relaxed: "1.75",
  },
} as const;

/** Border radius scale — consistent across themes */
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

  shadowDropdown: string;
  shadowOverlay: string;
  shadowFloat: string;
}

/** Dark theme color values */
export const darkColors: ThemeColors = {
  bgBase: "#0a0a0a",
  bgSurface: "#111111",
  bgElevated: "#1a1a1a",
  bgActive: "#2a2a2a",
  bgHover: "#222222",
  bgOverlay: "#252525",
  bgActiveAccent: "#1e1e2e",

  borderDefault: "#2a2a2a",
  borderSubtle: "#222222",
  borderStrong: "#333333",
  borderFocus: "#555555",
  borderOverlay: "#3a3a3a",

  textPrimary: "#fafafa",
  textSecondary: "#cccccc",
  textTertiary: "#aaaaaa",
  textMuted: "#888888",
  textDisabled: "#666666",
  textSubtle: "#555555",
  textFaint: "#444444",

  accentPrimary: "#6366f1",
  accentLight: "#818cf8",
  accentBlue: "#3b82f6",
  accentGreen: "#4ade80",

  shadowDropdown: "0 8px 24px rgba(0,0,0,0.6)",
  shadowOverlay: "0 4px 16px rgba(0,0,0,0.4)",
  shadowFloat: "0 2px 8px rgba(0,0,0,0.4)",
};

/** Light theme color values */
export const lightColors: ThemeColors = {
  bgBase: "#f8f8f8",
  bgSurface: "#f0f0f0",
  bgElevated: "#ffffff",
  bgActive: "#e4e4e7",
  bgHover: "#f4f4f5",
  bgOverlay: "#ffffff",
  bgActiveAccent: "#e8e8ff",

  borderDefault: "#e4e4e7",
  borderSubtle: "#e8e8ea",
  borderStrong: "#d4d4d8",
  borderFocus: "#a1a1aa",
  borderOverlay: "#d4d4d8",

  textPrimary: "#09090b",
  textSecondary: "#3f3f46",
  textTertiary: "#52525b",
  textMuted: "#71717a",
  textDisabled: "#a1a1aa",
  textSubtle: "#d4d4d8",
  textFaint: "#e4e4e7",

  accentPrimary: "#6366f1",
  accentLight: "#4f46e5",
  accentBlue: "#2563eb",
  accentGreen: "#16a34a",

  shadowDropdown: "0 8px 24px rgba(0,0,0,0.12)",
  shadowOverlay: "0 4px 16px rgba(0,0,0,0.08)",
  shadowFloat: "0 2px 8px rgba(0,0,0,0.08)",
};

/** Get colors for a resolved theme mode (not "system") */
export function getColorsForTheme(mode: Exclude<ThemeMode, "system">): ThemeColors {
  return mode === "dark" ? darkColors : lightColors;
}

/** Preset accent colors users can choose from */
export const accentPresets = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
] as const;

/** Generate a lighter variant of an accent color for hover states */
export function accentToLight(hex: string): string {
  // Simple lightening: blend with white at ~30%
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lighten = (c: number): number => Math.min(255, Math.round(c + (255 - c) * 0.3));
  const lr = lighten(r).toString(16).padStart(2, "0");
  const lg = lighten(g).toString(16).padStart(2, "0");
  const lb = lighten(b).toString(16).padStart(2, "0");
  return `#${lr}${lg}${lb}`;
}

/** Validate a hex color string (e.g. "#6366f1") */
export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Theme-aware chart color palettes for dashboard visualizations */
export const chartPalette = {
  dark: [
    "#6366f1", // Indigo
    "#3b82f6", // Blue
    "#06b6d4", // Cyan
    "#22c55e", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#a855f7", // Purple
    "#ec4899", // Pink
    "#f97316", // Orange
    "#14b8a6", // Teal
  ],
  light: [
    "#4f46e5", // Indigo (deeper for light bg)
    "#2563eb", // Blue
    "#0891b2", // Cyan
    "#16a34a", // Green
    "#d97706", // Amber
    "#dc2626", // Red
    "#9333ea", // Purple
    "#db2777", // Pink
    "#ea580c", // Orange
    "#0d9488", // Teal
  ],
} as const;

/** Get chart palette for the resolved theme mode */
export function getChartPalette(mode: Exclude<ThemeMode, "system">): readonly string[] {
  return chartPalette[mode];
}
