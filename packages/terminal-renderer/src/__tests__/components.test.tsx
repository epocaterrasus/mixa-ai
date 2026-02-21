// @mixa-ai/terminal-renderer — Component tests

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Header } from "../components/Header.js";
import { TextBlock } from "../components/TextBlock.js";
import { Table } from "../components/Table.js";
import { Card } from "../components/Card.js";
import { MetricRow } from "../components/MetricRow.js";
import { List } from "../components/List.js";
import { Form } from "../components/Form.js";
import { ActionBar } from "../components/ActionBar.js";
import { StatusBar } from "../components/StatusBar.js";
import {
  makeHeader,
  makeTextBlock,
  makeTable,
  makeCard,
  makeMetricRow,
  makeList,
  makeForm,
  makeActionBar,
  makeStatusBar,
  makeAction,
  resetIdCounter,
} from "./helpers.js";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  resetIdCounter();
});

describe("Header", () => {
  it("renders heading text", () => {
    render(<Header component={makeHeader("Dashboard")} />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
  });

  it("renders as h1 by default", () => {
    const { container } = render(<Header component={makeHeader("Title", 1)} />);
    expect(container.querySelector("h1")).toBeTruthy();
  });

  it("renders as h2 for level 2", () => {
    const { container } = render(<Header component={makeHeader("Subtitle", 2)} />);
    expect(container.querySelector("h2")).toBeTruthy();
  });

  it("renders as h3 for level 3", () => {
    const { container } = render(<Header component={makeHeader("Section", 3)} />);
    expect(container.querySelector("h3")).toBeTruthy();
  });
});

describe("TextBlock", () => {
  it("renders paragraph text", () => {
    render(<TextBlock component={makeTextBlock("Hello world")} />);
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders preformatted text in pre tag", () => {
    const { container } = render(
      <TextBlock component={makeTextBlock("const x = 1;", true)} />,
    );
    expect(container.querySelector("pre")).toBeTruthy();
    expect(screen.getByText("const x = 1;")).toBeTruthy();
  });

  it("renders normal text in p tag", () => {
    const { container } = render(
      <TextBlock component={makeTextBlock("Normal text", false)} />,
    );
    expect(container.querySelector("p")).toBeTruthy();
  });
});

describe("Table", () => {
  it("renders column headers", () => {
    render(<Table component={makeTable()} module="test" />);
    expect(screen.getByText("Name")).toBeTruthy();
    expect(screen.getByText("Value")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
  });

  it("renders row data", () => {
    render(<Table component={makeTable()} module="test" />);
    expect(screen.getByText("API_KEY")).toBeTruthy();
    expect(screen.getByText("localhost")).toBeTruthy();
  });

  it("filters rows", () => {
    render(<Table component={makeTable()} module="test" />);
    const filterInput = screen.getByPlaceholderText("Filter rows...");
    fireEvent.change(filterInput, { target: { value: "redis" } });
    expect(screen.getByText("REDIS_URL")).toBeTruthy();
    expect(screen.queryByText("API_KEY")).toBeNull();
  });

  it("emits click event on row click", () => {
    const onEvent = vi.fn();
    render(<Table component={makeTable()} module="test" onEvent={onEvent} />);
    const rows = screen.getAllByRole("row");
    // rows[0] is the header row, data rows start at [1]
    fireEvent.click(rows[1]!);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "test",
        eventType: "click",
        data: expect.objectContaining({ rowIndex: "0" }),
      }),
    );
  });

  it("shows empty state when no data", () => {
    const comp = makeTable();
    comp.rows = [];
    render(<Table component={comp} module="test" />);
    expect(screen.getByText("No data")).toBeTruthy();
  });
});

describe("Card", () => {
  it("renders title and body", () => {
    render(<Card component={makeCard("My Card", "Some content")} module="test" />);
    expect(screen.getByText("My Card")).toBeTruthy();
    expect(screen.getByText("Some content")).toBeTruthy();
  });

  it("renders action buttons", () => {
    const actions = [makeAction("edit", "Edit"), makeAction("delete", "Delete")];
    render(
      <Card component={makeCard("Card", "Body")} actions={actions} module="test" />,
    );
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("emits event on action click", () => {
    const onEvent = vi.fn();
    const actions = [makeAction("edit", "Edit")];
    render(
      <Card
        component={makeCard("Card", "Body")}
        actions={actions}
        onEvent={onEvent}
        module="test"
      />,
    );
    fireEvent.click(screen.getByText("Edit"));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "test",
        actionId: "edit",
        eventType: "click",
      }),
    );
  });

  it("does not emit event for disabled actions", () => {
    const onEvent = vi.fn();
    const actions = [makeAction("disabled-action", "Disabled", null, false)];
    render(
      <Card
        component={makeCard("Card", "Body")}
        actions={actions}
        onEvent={onEvent}
        module="test"
      />,
    );
    fireEvent.click(screen.getByText("Disabled"));
    expect(onEvent).not.toHaveBeenCalled();
  });
});

describe("MetricRow", () => {
  it("renders all metrics", () => {
    render(<MetricRow component={makeMetricRow()} />);
    expect(screen.getByText("Revenue")).toBeTruthy();
    expect(screen.getByText("$12,340")).toBeTruthy();
    expect(screen.getByText("Costs")).toBeTruthy();
    expect(screen.getByText("Users")).toBeTruthy();
  });

  it("shows trend percentages", () => {
    render(<MetricRow component={makeMetricRow()} />);
    // Up trend shows arrow and percentage
    expect(screen.getByText(/12\.5%/)).toBeTruthy();
  });
});

describe("List", () => {
  it("renders list items", () => {
    render(<List component={makeList(["Alpha", "Beta", "Gamma"])} module="test" />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();
  });

  it("emits event on item click", () => {
    const onEvent = vi.fn();
    render(
      <List
        component={makeList(["Alpha", "Beta"])}
        onEvent={onEvent}
        module="test"
      />,
    );
    fireEvent.click(screen.getByText("Beta"));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "click",
        data: expect.objectContaining({ index: "1", value: "Beta" }),
      }),
    );
  });

  it("supports keyboard navigation", () => {
    const onEvent = vi.fn();
    render(
      <List
        component={makeList(["Alpha", "Beta", "Gamma"])}
        onEvent={onEvent}
        module="test"
      />,
    );
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ index: "1", value: "Beta" }),
      }),
    );
  });

  it("shows empty state", () => {
    render(<List component={makeList([])} module="test" />);
    expect(screen.getByText("No items")).toBeTruthy();
  });
});

describe("Form", () => {
  it("renders form fields", () => {
    render(<Form component={makeForm()} module="test" />);
    expect(screen.getByLabelText(/Name/)).toBeTruthy();
    expect(screen.getByLabelText(/Environment/)).toBeTruthy();
    expect(screen.getByLabelText(/Debug mode/)).toBeTruthy();
  });

  it("validates required fields on submit", () => {
    const { container } = render(<Form component={makeForm()} module="test" />);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);
    expect(screen.getByText("Name is required")).toBeTruthy();
    expect(screen.getByText("Environment is required")).toBeTruthy();
  });

  it("emits event with values on valid submit", () => {
    const onEvent = vi.fn();
    render(<Form component={makeForm()} onEvent={onEvent} module="test" />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: "My Project" } });

    const envSelect = screen.getByLabelText(/Environment/);
    fireEvent.change(envSelect, { target: { value: "prod" } });

    fireEvent.click(screen.getByText("Submit"));

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "input",
        data: expect.objectContaining({
          name: "My Project",
          env: "prod",
          debug: "false",
        }),
      }),
    );
  });
});

describe("ActionBar", () => {
  it("renders action buttons", () => {
    const actions = [
      makeAction("save", "Save", "Ctrl+S"),
      makeAction("cancel", "Cancel"),
    ];
    render(
      <ActionBar component={makeActionBar()} actions={actions} module="test" />,
    );
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("shows shortcut badges", () => {
    const actions = [makeAction("save", "Save", "Ctrl+S")];
    render(
      <ActionBar component={makeActionBar()} actions={actions} module="test" />,
    );
    expect(screen.getByText("Ctrl+S")).toBeTruthy();
  });

  it("emits event on button click", () => {
    const onEvent = vi.fn();
    const actions = [makeAction("save", "Save")];
    render(
      <ActionBar
        component={makeActionBar()}
        actions={actions}
        onEvent={onEvent}
        module="test"
      />,
    );
    fireEvent.click(screen.getByText("Save"));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: "save",
        eventType: "click",
      }),
    );
  });
});

describe("StatusBar", () => {
  it("renders status text", () => {
    render(<StatusBar component={makeStatusBar("GUARD | dev | 3 secrets")} />);
    expect(screen.getByText("GUARD")).toBeTruthy();
    expect(screen.getByText("dev")).toBeTruthy();
    expect(screen.getByText("3 secrets")).toBeTruthy();
  });

  it("has status role", () => {
    render(<StatusBar component={makeStatusBar("Ready")} />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
