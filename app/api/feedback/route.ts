import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const VALID_RESULT_STATUS = ["smooth", "minor_trouble", "major_trouble"] as const;

type ResultStatus = (typeof VALID_RESULT_STATUS)[number];

function isValidResultStatus(value: unknown): value is ResultStatus {
  return typeof value === "string" && VALID_RESULT_STATUS.includes(value as ResultStatus);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const resultStatus = body?.resultStatus;
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const isPublishable = body?.isPublishable === true;

    if (!isValidResultStatus(resultStatus)) {
      return NextResponse.json(
        { ok: false, error: "invalid resultStatus" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("user_feedback").insert([
      {
        type: "feedback",
        rating: resultStatus,
        category: "retirement_result",
        message,
        page_path: "/feedback",
        is_publishable: isPublishable,
      },
    ]);

    if (error) {
      console.error("[feedback insert error]", error);
      return NextResponse.json(
        { ok: false, error: "insert failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[feedback route error]", error);
    return NextResponse.json(
      { ok: false, error: "server error" },
      { status: 500 }
    );
  }
}