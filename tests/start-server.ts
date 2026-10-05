import { spawn } from "node:child_process";
import "../playwright.config";
import setup from "./setup";
if (process.env.TURSO_DATABASE_URL !== "file:.cache-tests/e2e.db")
  throw new Error("O servidor de teste exige o banco isolado.");
await setup();
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", process.argv[2] ?? "3107"],
  { stdio: "inherit", env: process.env },
);
for (const event of ["SIGINT", "SIGTERM"] as const)
  process.on(event, () => child.kill(event));
child.on("exit", (code) => process.exit(code ?? 1));
