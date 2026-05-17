import { defineConfig } from "prisma/config";
import "dotenv/config";

const fallbackDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/atomquest";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
