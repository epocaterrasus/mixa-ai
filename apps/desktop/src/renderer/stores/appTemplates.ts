import type { AppTemplate } from "@mixa-ai/types";

/** Built-in templates for popular web apps */
export const APP_TEMPLATES: AppTemplate[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    url: "https://web.whatsapp.com",
    icon: "\uD83D\uDCAC",
    iconName: "chat",
    partitionStrategy: "per-instance",
  },
  {
    id: "slack",
    name: "Slack",
    url: "https://app.slack.com",
    icon: "\uD83D\uDCAD",
    iconName: "app",
    partitionStrategy: "per-instance",
  },
  {
    id: "discord",
    name: "Discord",
    url: "https://discord.com/app",
    icon: "\uD83C\uDFAE",
    iconName: "play",
    partitionStrategy: "per-instance",
  },
  {
    id: "gmail",
    name: "Gmail",
    url: "https://mail.google.com",
    icon: "\u2709\uFE0F",
    iconName: "inbox",
    partitionStrategy: "per-instance",
  },
  {
    id: "google-meet",
    name: "Google Meet",
    url: "https://meet.google.com",
    icon: "\uD83C\uDFA5",
    iconName: "camera",
    partitionStrategy: "per-instance",
  },
  {
    id: "notion",
    name: "Notion",
    url: "https://www.notion.so",
    icon: "\uD83D\uDCDD",
    iconName: "article",
    partitionStrategy: "per-instance",
  },
];

/** Find a template by ID */
export function getAppTemplate(id: string): AppTemplate | undefined {
  return APP_TEMPLATES.find((t) => t.id === id);
}

/** Generate a unique partition ID for an app tab instance */
export function generatePartitionId(templateId: string): string {
  return `app-${templateId}-${Date.now()}`;
}

/** Generate a shared partition ID for an app template */
export function sharedPartitionId(templateId: string): string {
  return `app-${templateId}`;
}
