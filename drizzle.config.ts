import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.OPENBULLION_DATABASE_URL_NON_POOLING || process.env.POSTGRES_URL_NON_POOLING)!,
  },
});
