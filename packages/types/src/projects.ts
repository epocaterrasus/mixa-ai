// @mixa-ai/types — Project domain types

/** A knowledge collection / workspace */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Association between an item and a project */
export interface ItemProject {
  itemId: string;
  projectId: string;
}
