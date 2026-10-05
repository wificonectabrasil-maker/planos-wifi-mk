import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { isAdminAuthDisabled } from "@/lib/admin/settings";
import { getExpectedSessionValue } from "@/lib/admin/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/" && request.nextUrl.searchParams.has("trk")) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("trk");
    return NextResponse.redirect(cleanUrl, 308);
  }

  if (pathname.endsWith(".html")) {
    return new NextResponse("Gone", { status: 410 });
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (isAdminAuthDisabled()) {
    return NextResponse.next();
  }

  const expectedHash = await getExpectedSessionValue();
  const isAuthed = request.cookies.get(ADMIN_COOKIE_NAME)?.value === expectedHash;
  if (isAuthed) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}


export const config = {
  matcher: "/:path*",
};
