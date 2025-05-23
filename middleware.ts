import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  // Exclude API routes from middleware
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};