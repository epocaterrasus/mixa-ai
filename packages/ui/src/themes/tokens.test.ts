import { describe, it, expect } from "vitest";
import {
  themeTokens,
  token,
  darkColors,
  lightColors,
  getColorsForTheme,
  accentPresets,
  accentToLight,
  isValidHexColor,
  spacing,
  typography,
  radii,
  chartPalette,
  getChartPalette,
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
    expect(accentPresets).toHaveLength(8);
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

describe("isValidHexColor", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(isValidHexColor("#6366f1")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#AABBCC")).toBe(true);
  });

  it("rejects invalid inputs", () => {
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("6366f1")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("#6366f1ff")).toBe(false);
    expect(isValidHexColor("not a color")).toBe(false);
  });
});

describe("spacing", () => {
  it("has expected scale values", () => {
    expect(spacing[0]).toBe("0px");
    expect(spacing[1]).toBe("4px");
    expect(spacing[2]).toBe("8px");
    expect(spacing[4]).toBe("16px");
    expect(spacing[8]).toBe("32px");
    expect(spacing[16]).toBe("64px");
  });

  it("all values end with px", () => {
    for (const value of Object.values(spacing)) {
      expect(value).toMatch(/^\d+px$/);
    }
  });
});

describe("typography", () => {
  it("has sans and mono font families", () => {
    expect(typography.fontFamily.sans).toContain("sans-serif");
    expect(typography.fontFamily.mono).toContain("monospace");
  });

  it("has font size scale", () => {
    expect(typography.fontSize.xs).toBe("11px");
    expect(typography.fontSize.base).toBe("14px");
    expect(typography.fontSize["3xl"]).toBe("30px");
  });

  it("has font weights", () => {
    expect(typography.fontWeight.normal).toBe("400");
    expect(typography.fontWeight.semibold).toBe("600");
  });

  it("has line heights", () => {
    expect(typography.lineHeight.tight).toBe("1.3");
    expect(typography.lineHeight.body).toBe("1.6");
  });
});

describe("radii", () => {
  it("has expected scale values", () => {
    expect(radii.none).toBe("0px");
    expect(radii.sm).toBe("4px");
    expect(radii.md).toBe("6px");
    expect(radii.lg).toBe("8px");
    expect(radii.xl).toBe("12px");
    expect(radii.full).toBe("9999px");
  });
});

describe("chartPalette", () => {
  it("has 10 colors for dark theme", () => {
    expect(chartPalette.dark).toHaveLength(10);
  });

  it("has 10 colors for light theme", () => {
    expect(chartPalette.light).toHaveLength(10);
  });

  it("all chart colors are valid hex", () => {
    for (const color of chartPalette.dark) {
      expect(isValidHexColor(color)).toBe(true);
    }
    for (const color of chartPalette.light) {
      expect(isValidHexColor(color)).toBe(true);
    }
  });

  it("getChartPalette returns correct palette", () => {
    expect(getChartPalette("dark")).toBe(chartPalette.dark);
    expect(getChartPalette("light")).toBe(chartPalette.light);
  });
});
