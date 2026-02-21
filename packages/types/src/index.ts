// @mixa-ai/types — Shared TypeScript types for the Mixa AI project

export type {
  Item,
  ItemType,
  SourceType,
  Chunk,
  Tag,
  ItemTag,
  Highlight,
} from "./knowledge.js";

export type { Project, ItemProject } from "./projects.js";

export type {
  MessageRole,
  ChatScope,
  Citation,
  Message,
  Conversation,
} from "./chat.js";

export type {
  TabType,
  TabState,
  AppPartitionStrategy,
  Tab,
  Space,
  AppTemplate,
} from "./tabs.js";

export type {
  EngineModuleName,
  EngineStatusCode,
  EngineModule,
  EngineStatus,
  EngineCommand,
  EngineEvent,
} from "./engine.js";

export type {
  UIComponentType,
  ChartType,
  TrendDirection,
  RowData,
  ChartDataPoint,
  Metric,
  TableColumn,
  FormField,
  UIComponent,
  UIAction,
  UIView,
  UIEvent,
} from "./protocol.js";

export type {
  LLMProviderName,
  LLMProvider,
  LLMConfig,
  ThemeMode,
  SidebarPosition,
  TabBarPosition,
  ThemeConfig,
  KeyboardShortcut,
  UserSettings,
} from "./settings.js";
