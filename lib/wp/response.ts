import { NextResponse } from "next/server";

export function wpError(status: number, message: string, code = "rest_forbidden") {
  return NextResponse.json({ code, message, data: { status } }, { status });
}