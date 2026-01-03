import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL || "";

if (!dbUrl) {
  console.error("Error: PGDATABASE_URL or DATABASE_URL is not set");
  process.exit(1);
}

const workspacePath = process.env.WORKSPACE_PATH || "/workspace/projects";

export default defineConfig({
  schema: `./src/storage/database/shared/schema.ts`,
  out: "/source/storage_skill/drizzle/meta",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  },
  verbose: false,
  strict: false,
});
