import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://memory-verse-ai.netlify.app";

  // Retain hash parameters or query params if present and redirect back to app root
  const destination = new URL("/", siteUrl);
  requestUrl.searchParams.forEach((value, key) => {
    destination.searchParams.set(key, value);
  });

  return NextResponse.redirect(destination);
}
