import { NextResponse, type NextRequest } from "next/server";

const USER_COOKIE = "pf_uid";

export function proxy(request: NextRequest) {
  if (request.cookies.has(USER_COOKIE)) return NextResponse.next();

  const id = crypto.randomUUID();
  // Make the cookie visible to this request's server code, and persist it in the browser.
  request.cookies.set(USER_COOKIE, id);
  const response = NextResponse.next({ request });
  response.cookies.set(USER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico).*)"],
};
