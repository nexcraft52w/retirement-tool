import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CountRequestBody = {
  type?: "view" | "pdf" | "postal";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CountRequestBody;
    const type = body?.type;

    if (!type || !["view", "pdf", "postal"].includes(type)) {
      return NextResponse.json(
        { ok: false, error: "invalid type" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[count env error]", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });

      return NextResponse.json(
        { ok: false, error: "env missing" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error } = await supabaseAdmin.from("access_counts").insert([
      {
        event_type: type,
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