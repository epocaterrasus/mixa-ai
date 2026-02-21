import { router } from "./trpc.js";
import { itemsRouter } from "./routers/items.js";
import { projectsRouter } from "./routers/projects.js";
import { tagsRouter } from "./routers/tags.js";
import { searchRouter } from "./routers/search.js";
import { chatRouter } from "./routers/chat.js";
import { settingsRouter } from "./routers/settings.js";
import { engineRouter } from "./routers/engine.js";

export const appRouter = router({
  items: itemsRouter,
  projects: projectsRouter,
  tags: tagsRouter,
  search: searchRouter,
  chat: chatRouter,
  settings: settingsRouter,
  engine: engineRouter,
});

export type AppRouter = typeof appRouter;
