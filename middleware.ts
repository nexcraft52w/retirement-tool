import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return new NextResponse("ADMIN_PASSWORD is not set", { status: 500 });
  }

  if (auth) {
    const [scheme, encoded] = auth.split(" ");

    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [, inputPassword] = decoded.split(":");

      if (inputPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};