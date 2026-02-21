import { createDbClient } from "./client.js";
import { users } from "./schema/users.js";
import { items } from "./schema/items.js";
import { tags } from "./schema/tags.js";
import { itemTags } from "./schema/item-tags.js";
import { projects } from "./schema/projects.js";
import { itemProjects } from "./schema/item-projects.js";

async function seed() {
  const { db, sql } = createDbClient();

  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Create a sample user
    const [user] = await db
      .insert(users)
      .values({
        email: "dev@mixa.ai",
        displayName: "Mixa Developer",
      })
      .returning();

    if (!user) throw new Error("Failed to create user");

    // Create sample tags
    const [tagTypescript] = await db
      .insert(tags)
      .values({ name: "typescript", color: "#3178c6" })
      .returning();
    const [tagReact] = await db
      .insert(tags)
      .values({ name: "react", color: "#61dafb" })
      .returning();
    const [tagDevtools] = await db
      .insert(tags)
      .values({ name: "devtools", color: "#f59e0b" })
      .returning();

    if (!tagTypescript || !tagReact || !tagDevtools) {
      throw new Error("Failed to create tags");
    }

    // Create a sample project
    const [project] = await db
      .insert(projects)
      .values({
        userId: user.id,
        name: "Learning",
        description: "Articles and resources for learning",
        icon: "book",
        color: "#8b5cf6",
        isDefault: true,
      })
      .returning();

    if (!project) throw new Error("Failed to create project");

    // Create sample items
    const [article] = await db
      .insert(items)
      .values({
        userId: user.id,
        url: "https://react.dev/learn",
        title: "Quick Start – React",
        description: "Learn React basics with the official guide",
        contentText:
          "Welcome to the React documentation! This page will give you an introduction to 80% of the React concepts that you will use on a daily basis.",
        itemType: "article",
        sourceType: "manual",
        domain: "react.dev",
        faviconUrl: "https://react.dev/favicon.ico",
        wordCount: 2500,
        readingTime: 10,
        summary:
          "Official React quick start guide covering components, JSX, state, and event handling.",
      })
      .returning();

    const [codeSnippet] = await db
      .insert(items)
      .values({
        userId: user.id,
        title: "TypeScript Utility Types",
        contentText:
          "type Partial<T> = { [P in keyof T]?: T[P] }; type Required<T> = { [P in keyof T]-?: T[P] };",
        itemType: "code",
        sourceType: "manual",
        wordCount: 25,
        readingTime: 1,
      })
      .returning();

    if (!article || !codeSnippet) {
      throw new Error("Failed to create items");
    }

    // Link tags to items
    await db.insert(itemTags).values([
      { itemId: article.id, tagId: tagReact.id, score: 1.0 },
      { itemId: codeSnippet.id, tagId: tagTypescript.id, score: 1.0 },
      { itemId: codeSnippet.id, tagId: tagDevtools.id, score: 0.7 },
    ]);

    // Link items to project
    await db.insert(itemProjects).values([
      { itemId: article.id, projectId: project.id },
      { itemId: codeSnippet.id, projectId: project.id },
    ]);

    console.warn("Seed completed successfully!");
    console.warn(`  User: ${user.email} (${user.id})`);
    console.warn(`  Tags: ${[tagTypescript.name, tagReact.name, tagDevtools.name].join(", ")}`);
    console.warn(`  Project: ${project.name}`);
    console.warn(`  Items: ${article.title}, ${codeSnippet.title}`);
  } finally {
    await sql.end();
  }
}

seed().catch((err: unknown) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
