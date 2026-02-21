import { describe, it, expect } from "vitest";
import {
  themeTokens,
  token,
  darkColors,
  lightColors,
  getColorsForTheme,
  accentPresets,
  accentToLight,
} from "./tokens";

describe("themeTokens", () => {
  it("all token names start with --mixa-", () => {
    for (const [, value] of Object.entries(themeTokens)) {
      expect(value).toMatch(/^--mixa-/);
    }
  });

  it("token() returns var() wrapper", () => {
    expect(token("bgBase")).toBe("var(--mixa-bg-base)");
    expect(token("textPrimary")).toBe("var(--mixa-text-primary)");
    expect(token("accentPrimary")).toBe("var(--mixa-accent-primary)");
  });
});

describe("darkColors and lightColors", () => {
  it("dark colors have valid hex values for color properties", () => {
    const colorKeys = Object.keys(darkColors).filter(
      (k) => !k.startsWith("shadow"),
    );
    for (const key of colorKeys) {
      const value = darkColors[key as keyof typeof darkColors];
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("light colors have valid hex values for color properties", () => {
    const colorKeys = Object.keys(lightColors).filter(
      (k) => !k.startsWith("shadow"),
    );
    for (const key of colorKeys) {
      const value = lightColors[key as keyof typeof lightColors];
      expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("shadow values are non-empty strings", () => {
    expect(darkColors.shadowDropdown.length).toBeGreaterThan(0);
    expect(darkColors.shadowOverlay.length).toBeGreaterThan(0);
    expect(darkColors.shadowFloat.length).toBeGreaterThan(0);
    expect(lightColors.shadowDropdown.length).toBeGreaterThan(0);
  });

  it("dark and light have the same keys", () => {
    const darkKeys = Object.keys(darkColors).sort();
    const lightKeys = Object.keys(lightColors).sort();
    expect(darkKeys).toEqual(lightKeys);
  });

  it("dark text-primary is light, light text-primary is dark", () => {
    // Dark theme: white text on dark bg
    const darkText = parseInt(darkColors.textPrimary.slice(1), 16);
    expect(darkText).toBeGreaterThan(0xaaaaaa);

    // Light theme: dark text on light bg
    const lightText = parseInt(lightColors.textPrimary.slice(1), 16);
    expect(lightText).toBeLessThan(0x555555);
  });
});

describe("getColorsForTheme", () => {
  it("returns dark colors for 'dark'", () => {
    expect(getColorsForTheme("dark")).toBe(darkColors);
  });

  it("returns light colors for 'light'", () => {
    expect(getColorsForTheme("light")).toBe(lightColors);
  });
});

describe("accentPresets", () => {
  it("has 10 presets", () => {
    expect(accentPresets).toHaveLength(10);
  });

  it("all presets have valid hex colors", () => {
    for (const preset of accentPresets) {
      expect(preset.value).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });

  it("preset names are unique", () => {
    const names = accentPresets.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("preset values are unique", () => {
    const values = accentPresets.map((p) => p.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("accentToLight", () => {
  it("returns a valid hex color", () => {
    const result = accentToLight("#6366f1");
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("returns a lighter color than input", () => {
    const input = "#6366f1";
    const output = accentToLight(input);

    // Lighter means higher average RGB
    const avgInput =
      (parseInt(input.slice(1, 3), 16) +
        parseInt(input.slice(3, 5), 16) +
        parseInt(input.slice(5, 7), 16)) /
      3;
    const avgOutput =
      (parseInt(output.slice(1, 3), 16) +
        parseInt(output.slice(3, 5), 16) +
        parseInt(output.slice(5, 7), 16)) /
      3;

    expect(avgOutput).toBeGreaterThan(avgInput);
  });

  it("does not exceed #ffffff", () => {
    const result = accentToLight("#ffffff");
    expect(result).toBe("#ffffff");
  });

  it("lightens pure black", () => {
    const result = accentToLight("#000000");
    const r = parseInt(result.slice(1, 3), 16);
    const g = parseInt(result.slice(3, 5), 16);
    const b = parseInt(result.slice(5, 7), 16);
    // 30% blend with white from #000000 = ~#4d4d4d
    expect(r).toBeGreaterThan(0);
    expect(g).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });
});
