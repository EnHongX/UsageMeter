import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://usagemeter:usagemeter@localhost:55432/usagemeter?schema=test";

execFileSync(
  fileURLToPath(new URL("../../../node_modules/.bin/prisma", import.meta.url)),
  ["db", "push", "--schema", "prisma/schema.prisma", "--skip-generate"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: process.env,
    stdio: "inherit"
  }
);
