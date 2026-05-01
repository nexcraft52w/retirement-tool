import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { resultStatus, message, isPublishable } = body;

    if (!resultStatus) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("user_feedback").insert([
      {
        type: "feedback",
        rating: resultStatus,
        category: "retirement_result",
        message: message || "",
        page_path: "/feedback",
        is_publishable: isPublishable,
      },
    ]);

    if (error) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}