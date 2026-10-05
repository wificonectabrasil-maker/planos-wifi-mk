export function isAdminAuthDisabled() {
  // Keep production admin routes protected even if a local env flag leaks.
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.ADMIN_DISABLE_AUTH === "1";
}

export function getAdminEmail() {
  return (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
}

export function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  throw new Error("Configure ADMIN_PASSWORD para acessar o painel.");
}
