import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPanelPage = pathname.startsWith("/panel");

  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL("/panel", req.nextUrl));
  }

  if (isPanelPage && !isAuth) {
    const from = req.nextUrl.pathname + req.nextUrl.search;
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/panel/:path*", "/login", "/register"],
};