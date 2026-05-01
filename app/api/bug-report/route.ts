import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const category = typeof body.category === "string" ? body.category : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const pagePath = typeof body.pagePath === "string" ? body.pagePath : "/bug-report";
    const userAgent = typeof body.userAgent === "string" ? body.userAgent : "";

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "message required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("user_feedback").insert([
      {
        type: "bug",
        rating: null,
        category: category || null,
        message,
        page_path: pagePath,
        user_agent: userAgent,
      },
    ]);

    if (error) {
      console.error("[bug-report insert error]", error);
      return NextResponse.json(
        { ok: false, error: "insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[bug-report api error]", error);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}