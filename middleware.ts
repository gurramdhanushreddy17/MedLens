import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin-only routes
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET || "l/Q5WqslQu0XpUq1c91iXs5Yfzxfhn7Xe16hHXvbBZI=",
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/admin/:path*",
    "/api/patients/:path*",
    "/api/reports/:path*",
    "/api/lab-results/:path*",
    "/api/summaries/:path*",
    "/api/export/:path*",
    "/api/clarifications/:path*",
    "/api/inconsistencies/:path*",
  ],
};
