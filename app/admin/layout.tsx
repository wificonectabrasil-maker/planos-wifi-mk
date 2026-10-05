"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { AdminHeader } from "@/app/admin/components/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const isPreviewRoute = segments[0] === "preview";
  const isEditorRoute = segments[0] === "editor";

  if (isPreviewRoute) {
    return <>{children}</>;
  }

  return (
    <div className="admin-app flex h-screen w-screen flex-col overflow-hidden text-(--text)">
      <AdminHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isEditorRoute ? (
          <div className="h-full min-h-0 w-full">{children}</div>
        ) : (
          <div className="admin-scrollbar h-full w-full overflow-auto px-3 pb-3 md:px-4 md:pb-4">
            <div className="mx-auto min-h-full max-w-[1800px] pt-3 md:pt-4">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
