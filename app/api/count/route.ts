import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type CountRequestBody = {
  type?: "view" | "pdf" | "postal";
  sessionId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CountRequestBody;
    const type = body?.type;
    const sessionId = body?.sessionId || null;

    if (!type || !["view", "pdf", "postal"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "invalid type" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("access_counts").insert([
      {
        event_type: type,
        session_id: sessionId,
      },
    ]);

    if (error) {
      console.error("[count insert error]", error);

      return NextResponse.json(
        { ok: false, error: "insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[count api error]", error);

    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}