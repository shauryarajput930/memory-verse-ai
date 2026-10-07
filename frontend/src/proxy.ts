import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { method, headers } = request;
  const userAgent = (headers.get("user-agent") || "").toLowerCase();

  // 1. Instantly respond 200 OK to OPTIONS preflight requests for CORS compatibility
  if (method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, User-Agent, Accept, Cache-Control",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 2. Instantly respond 200 OK to HEAD requests from preview bots/tools to prevent 405/500 errors
  if (method === "HEAD") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  // 3. Known bots and API tooling user agents
  const botUserAgents = [
    "slackbot",
    "twitterbot",
    "facebookexternalhit",
    "linkedinbot",
    "discordbot",
    "telegrambot",
    "whatsapp",
    "googlebot",
    "bingbot",
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "curl",
    "postman",
    "python-requests",
    "httpx",
    "axios",
    "node-fetch",
    "uptimerobot",
    "pingdom",
    "netlify",
  ];

  const isBotOrTool = botUserAgents.some((bot) => userAgent.includes(bot));

  const response = NextResponse.next();

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, HEAD"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");

  if (isBotOrTool) {
    response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  }

  return response;
}

// Support standard middleware default export as well
export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
