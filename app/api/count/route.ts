import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type CountEventType =
  | "page_view"
  | "click"
  | "pdf_download"
  | "postal_start"
  | "checkout_start"
  | "checkout_success";

type CountRequestBody = {
  eventType?: CountEventType;
  pagePath?: string;
  action?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

const VALID_EVENT_TYPES: CountEventType[] = [
  "page_view",
  "click",
  "pdf_download",
  "postal_start",
  "checkout_start",
  "checkout_success",
];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CountRequestBody;

    const eventType = body.eventType;
    const pagePath = typeof body.pagePath === "string" ? body.pagePath.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const metadata =
      body.metadata && typeof body.metadata === "object" ? body.metadata : null;

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { ok: false, error: "invalid eventType" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("access_counts").insert([
      {
        event_type: eventType,
        page_path: pagePath || null,
        action: action || null,
        session_id: sessionId || null,
        metadata,
        user_agent: req.headers.get("user-agent"),
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