import { NextResponse } from "next/server";
import { authenticateWpRequest } from "@/lib/wp/auth";
import { getOrCreateWpIdByKey } from "@/lib/wp/id-map";
import { slugify } from "@/lib/wp/slugify";
import { wpError } from "@/lib/wp/response";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateWpRequest(req);
  if (!auth.ok) {
    return wpError(auth.status, auth.message, auth.code);
  }

  const displayName = auth.user.displayName || auth.user.username;
  const id = await getOrCreateWpIdByKey("user", auth.user.username);

  return NextResponse.json({
    id,
    name: displayName,
    slug: slugify(displayName || auth.user.username),
    username: auth.user.username,
  });
}