import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();

    const {
      penName,
      title,
      body: content,
      stressRelief,
      discountType,
      discountAmount,
    } = requestBody;

    if (!title || !content) {
      return NextResponse.json({ error: "入力不足です" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("episodes")
      .insert({
        pen_name: penName || "",
        title,
        body: content,
        stress_relief: stressRelief || "",
        company_name: "",
        sender_name: "",
        sender_address: "",
        discount_type: discountType || "post",
        discount_amount: Number(discountAmount) || 0,

        ai_polished_title: "",
        ai_polished_body: "",
        ai_polished_stress_relief: "",

        status: "unchecked",
        is_public: false,
      })
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: `保存失敗: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("episode-submit route error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
