// @mixa-ai/terminal-renderer — UIViewRenderer
// Parses a UIView and renders the correct component for each UIComponent

import { useCallback } from "react";
import type { UIAction, UIComponent, UIEvent, UIView } from "@mixa-ai/types";
import { Header } from "./components/Header.js";
import { TextBlock } from "./components/TextBlock.js";
import { Table } from "./components/Table.js";
import { Card } from "./components/Card.js";
import { Chart } from "./components/Chart.js";
import { MetricRow } from "./components/MetricRow.js";
import { List } from "./components/List.js";
import { Form } from "./components/Form.js";
import { ActionBar } from "./components/ActionBar.js";
import { StatusBar } from "./components/StatusBar.js";
import { containerBase } from "./styles.js";
import { spacing } from "@mixa-ai/ui";

export interface UIViewRendererProps {
  view: UIView;
  onEvent?: (event: UIEvent) => void;
}

/**
 * Find actions associated with a given component.
 * Actions are associated by position: actions listed after a component
 * and before the next component belong to that component.
 * For simplicity, we pass all view-level actions to Card and ActionBar components.
 */
function getActionsForComponent(
  component: UIComponent,
  allActions: UIAction[],
): UIAction[] {
  // Card and ActionBar get the full action list from the view
  if (component.type === "card" || component.type === "action_bar") {
    return allActions;
  }
  return [];
}

function renderComponent(
  component: UIComponent,
  actions: UIAction[],
  module: string,
  onEvent?: (event: UIEvent) => void,
): React.JSX.Element {
  switch (component.type) {
    case "header":
      return <Header key={component.id} component={component} />;
    case "text_block":
      return <TextBlock key={component.id} component={component} />;
    case "table":
      return (
        <Table key={component.id} component={component} onEvent={onEvent} module={module} />
      );
    case "card":
      return (
        <Card
          key={component.id}
          component={component}
          actions={actions}
          onEvent={onEvent}
          module={module}
        />
      );
    case "chart":
      return <Chart key={component.id} component={component} />;
    case "metric_row":
      return <MetricRow key={component.id} component={component} />;
    case "list":
      return (
        <List key={component.id} component={component} onEvent={onEvent} module={module} />
      );
    case "form":
      return (
        <Form key={component.id} component={component} onEvent={onEvent} module={module} />
      );
    case "action_bar":
      return (
        <ActionBar
          key={component.id}
          component={component}
          actions={actions}
          onEvent={onEvent}
          module={module}
        />
      );
    case "status_bar":
      return <StatusBar key={component.id} component={component} />;
  }
}

const viewContainerStyle: React.CSSProperties = {
  ...containerBase,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "auto",
  padding: spacing[4],
};

export function UIViewRenderer({ view, onEvent }: UIViewRendererProps): React.JSX.Element {
  const handleEvent = useCallback(
    (event: UIEvent) => {
      onEvent?.(event);
    },
    [onEvent],
  );

  return (
    <div style={viewContainerStyle} data-module={view.module}>
      {view.components.map((component) => {
        const actions = getActionsForComponent(component, view.actions);
        return renderComponent(component, actions, view.module, handleEvent);
      })}
    </div>
  );
}
