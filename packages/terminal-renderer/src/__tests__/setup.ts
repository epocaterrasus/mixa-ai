import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Auto-cleanup DOM after each test
afterEach(() => {
  cleanup();
});
