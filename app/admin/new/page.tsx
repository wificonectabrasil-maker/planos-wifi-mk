import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";

export const revalidate = 0;

export default async function LegacyNewPage() {
  await requireAdminSession();
  redirect("/admin/editor/new");
}
