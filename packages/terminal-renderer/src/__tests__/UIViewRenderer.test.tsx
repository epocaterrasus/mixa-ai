// @mixa-ai/terminal-renderer — UIViewRenderer tests

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { UIViewRenderer } from "../UIViewRenderer.js";
import {
  makeHeader,
  makeTextBlock,
  makeTable,
  makeCard,
  makeMetricRow,
  makeList,
  makeForm,
  makeStatusBar,
  makeActionBar,
  makeAction,
  makeView,
  resetIdCounter,
} from "./helpers.js";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  resetIdCounter();
});

describe("UIViewRenderer", () => {
  it("renders a view with multiple component types", () => {
    const view = makeView([
      makeHeader("Dashboard"),
      makeTextBlock("Overview of your project"),
      makeMetricRow(),
      makeStatusBar("Module: cost | Status: active"),
    ]);

    render(<UIViewRenderer view={view} />);

    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Overview of your project")).toBeTruthy();
    expect(screen.getByText("Revenue")).toBeTruthy();
  });

  it("passes actions to card components", () => {
    const actions = [makeAction("edit", "Edit"), makeAction("delete", "Delete")];
    const view = makeView([makeCard("Project", "Description")], actions);

    render(<UIViewRenderer view={view} />);

    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("passes actions to action bar components", () => {
    const actions = [makeAction("save", "Save"), makeAction("cancel", "Cancel")];
    const view = makeView([makeActionBar()], actions);

    render(<UIViewRenderer view={view} />);

    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("forwards events from interactive components", () => {
    const onEvent = vi.fn();
    const view = makeView([makeList(["Option A", "Option B"])]);

    render(<UIViewRenderer view={view} onEvent={onEvent} />);

    fireEvent.click(screen.getByText("Option B"));

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "test-module",
        eventType: "click",
        data: expect.objectContaining({ value: "Option B" }),
      }),
    );
  });

  it("renders table with event forwarding", () => {
    const onEvent = vi.fn();
    const view = makeView([makeTable()]);

    render(<UIViewRenderer view={view} onEvent={onEvent} />);

    expect(screen.getByText("API_KEY")).toBeTruthy();
    const rows = screen.getAllByRole("row");
    fireEvent.click(rows[1]!);
    expect(onEvent).toHaveBeenCalled();
  });

  it("renders form with event forwarding", () => {
    const onEvent = vi.fn();
    const view = makeView([makeForm()]);

    render(<UIViewRenderer view={view} onEvent={onEvent} />);

    expect(screen.getByLabelText(/Name/)).toBeTruthy();
  });

  it("sets data-module attribute on container", () => {
    const view = makeView([makeHeader("Test")]);
    const { container } = render(<UIViewRenderer view={view} />);

    const moduleContainer = container.querySelector("[data-module='test-module']");
    expect(moduleContainer).toBeTruthy();
  });

  it("renders empty view without errors", () => {
    const view = makeView([]);
    const { container } = render(<UIViewRenderer view={view} />);
    expect(container.querySelector("[data-module='test-module']")).toBeTruthy();
  });
});
