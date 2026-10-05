"use client";

import { useState, type FormEvent } from "react";

export function AdminLoginForm({
  nextPath,
  initialEmail,
}: {
  nextPath: string;
  initialEmail?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        body: form,
      });

      if (response.ok && response.redirected) {
        window.location.assign(response.url);
        return;
      }

      const result = await response.json();
      setError(
        typeof result.error === "string"
          ? result.error
          : "Não foi possível entrar. Tente novamente.",
      );
    } catch {
      setError("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action="/api/admin/login"
      onSubmit={handleSubmit}
      aria-busy={pending}
      className="admin-pane space-y-4 p-4"
    >
      <input type="hidden" name="next" value={nextPath} />

      <div className="space-y-2">
        <label className="text-xs text-(--muted)" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={initialEmail}
          autoComplete="username"
          required
          className="admin-input"
          placeholder="E-mail do administrador"
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-(--muted)" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="admin-input"
          placeholder="Digite a sua senha"
          aria-describedby={error ? "login-error" : undefined}
        />
      </div>

      {error && (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg border border-(--admin-danger) bg-(--admin-danger-soft) p-3 text-sm text-(--text)"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="admin-button-primary w-full"
      >
        {pending ? "Entrando…" : "Entrar no Painel"}
      </button>
    </form>
  );
}
