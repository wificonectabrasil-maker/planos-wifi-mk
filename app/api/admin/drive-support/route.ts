import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  EDITORIAL_SUPPORT_FOLDER,
  EDITORIAL_SUPPORT_SOURCES,
  selectDriveSupportSources,
} from "@/lib/editorial/drive-support";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireAdminSession();

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const keyword = url.searchParams.get("keyword");
  const title = url.searchParams.get("title");

  return NextResponse.json({
    ok: true,
    folder: EDITORIAL_SUPPORT_FOLDER,
    selectedSources: selectDriveSupportSources({ slug, keyword, title }),
    allSources: EDITORIAL_SUPPORT_SOURCES,
  });
}
