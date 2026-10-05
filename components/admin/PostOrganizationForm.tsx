"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updatePostOrganization,
  type UpdatePostOrganizationState,
} from "@/app/admin/actions";
import { buildPostCanonicalPath } from "@/lib/seo/canonical";
import type { Silo } from "@/lib/types";

type OrganizationRole = "PILLAR" | "SUPPORT" | "AUX";

type SiloGroupOption = {
  key: string;
  label: string;
  menu_order: number;
};

type Props = {
  postId: string;
  postSlug: string;
  silos: Array<Pick<Silo, "id" | "name" | "slug">>;
  siloGroupsBySiloId: Record<string, SiloGroupOption[]>;
  initialSiloId: string;
  initialRole: OrganizationRole;
  initialPosition: number | null;
  initialGroup: string | null;
  initialOrder: number;
  initialShowInSiloMenu: boolean;
};

function isRole(value: string): value is OrganizationRole {
  return value === "PILLAR" || value === "SUPPORT" || value === "AUX";
}

const INITIAL_STATE: UpdatePostOrganizationState = {
  ok: false,
  success: null,
  error: null,
  canonicalPath: null,
};

export function PostOrganizationForm(props: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<UpdatePostOrganizationState, FormData>(
    updatePostOrganization,
    INITIAL_STATE
  );
  const [open, setOpen] = useState(false);
  const [siloId, setSiloId] = useState(props.initialSiloId);
  const [role, setRole] = useState<OrganizationRole>(props.initialRole);
  const [position, setPosition] = useState(String(props.initialPosition ?? 1));
  const [group, setGroup] = useState(props.initialGroup ?? "");
  const [order, setOrder] = useState(String(props.initialOrder));
  const [showInSiloMenu, setShowInSiloMenu] = useState(props.initialShowInSiloMenu);

  const selectedSilo = props.silos.find((item) => item.id === siloId) ?? null;
  const availableGroups = props.siloGroupsBySiloId[siloId] ?? [];
  const canonicalPreview = buildPostCanonicalPath(selectedSilo?.slug ?? null, props.postSlug) ?? "";
  const isPillarRole = role === "PILLAR";
  const isAuxRole = role === "AUX";

  useEffect(() => {
    if (!state.ok) return;
    const timer = window.setTimeout(() => {
      router.refresh();
      setOpen(false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [router, state.ok]);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="group min-w-[320px]"
    >
      <summary className="admin-button-soft min-h-[34px] cursor-pointer list-none px-3 py-1.5 text-[11px]">
        Organizar
      </summary>

      <div className="mt-2 rounded-2xl border border-(--border-strong) bg-[rgba(19,23,29,0.96)] p-3 shadow-[0_18px_34px_-24px_rgba(0,0,0,0.5)]">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={props.postId} />
          <input type="hidden" name="show_in_silo_menu" value={showInSiloMenu ? "1" : "0"} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">Silo</span>
              <select
                name="silo_id"
                value={siloId}
                onChange={(event) => {
                  const nextSiloId = event.target.value;
                  const nextGroups = props.siloGroupsBySiloId[nextSiloId] ?? [];
                  setSiloId(nextSiloId);
                  if (group && !nextGroups.some((item) => item.key === group)) {
                    setGroup("");
                  }
                }}
                className="admin-select"
              >
                {props.silos.map((silo) => (
                  <option key={silo.id} value={silo.id}>
                    {silo.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">Papel</span>
              <select
                name="silo_role"
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value;
                  if (!isRole(nextRole)) return;
                  setRole(nextRole);
                  if (nextRole === "PILLAR") {
                    setPosition("1");
                    setGroup("");
                    setOrder("0");
                    setShowInSiloMenu(true);
                    return;
                  }
                  if (nextRole === "AUX") {
                    setGroup("");
                    setOrder("0");
                    setShowInSiloMenu(false);
                    if (!position.trim()) setPosition("1");
                    return;
                  }
                  if (!position.trim()) setPosition("1");
                }}
                className="admin-select"
              >
                <option value="PILLAR">Pilar</option>
                <option value="SUPPORT">Suporte</option>
                <option value="AUX">Apoio</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">
                Número do post
              </span>
              <input
                type="number"
                min={1}
                max={999}
                name="silo_position"
                value={isPillarRole ? "1" : position}
                onChange={(event) => setPosition(event.target.value)}
                className="admin-input"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">
                Ordem no grupo
              </span>
              <input
                type="number"
                min={0}
                max={999}
                name="silo_group_order"
                value={isPillarRole || isAuxRole ? "0" : order}
                onChange={(event) => setOrder(event.target.value)}
                disabled={isPillarRole || isAuxRole}
                className="admin-input disabled:cursor-not-allowed disabled:opacity-55"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">
              Grupo editorial
            </span>
            <select
              name="silo_group"
              value={isPillarRole || isAuxRole ? "" : group}
              onChange={(event) => setGroup(event.target.value)}
              disabled={isPillarRole || isAuxRole}
              className="admin-select disabled:cursor-not-allowed disabled:opacity-55"
            >
              <option value="">Sem grupo</option>
              {availableGroups.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-[12px] text-(--text)">
            <input
              type="checkbox"
              checked={isPillarRole ? true : isAuxRole ? false : showInSiloMenu}
              disabled={isPillarRole || isAuxRole}
              onChange={(event) => setShowInSiloMenu(event.target.checked)}
              className="h-4 w-4 rounded border-(--border-strong)"
            />
            Mostrar no hub do silo
          </label>

          <div className="rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-(--muted-2)">Canonical</div>
            <div className="mt-1 text-[12px] text-(--text)">{canonicalPreview || "/"}</div>
          </div>

          {state.error ? (
            <div className="rounded-xl border border-[rgba(249,73,76,0.35)] bg-[rgba(249,73,76,0.12)] px-3 py-2 text-[11px] text-[rgba(255,214,215,0.96)]">
              {state.error}
            </div>
          ) : null}

          {state.ok && state.success ? (
            <div className="rounded-xl border border-[rgba(64,209,219,0.35)] bg-[rgba(64,209,219,0.12)] px-3 py-2 text-[11px] text-[rgba(219,255,255,0.96)]">
              {state.success}
            </div>
          ) : null}

          <button type="submit" disabled={pending} className="admin-button-primary w-full justify-center">
            {pending ? "Salvando..." : "Salvar organização"}
          </button>
        </form>
      </div>
    </details>
  );
}
