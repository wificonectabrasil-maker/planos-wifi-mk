import { getTursoClient } from "./client";
import { createDatabase } from "./query";
export function getAdminDatabase() {
  return createDatabase(getTursoClient(), "admin");
}
export function getPublicDatabase() {
  return createDatabase(getTursoClient(), "public");
}
export { getTursoClient, isDatabaseConfigured } from "./client";
