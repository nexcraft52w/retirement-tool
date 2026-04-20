import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const isFreeMode = process.env.NEXT_PUBLIC_POSTAL_FREE_MODE === "true";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const price = Number(process.env.POSTAL_SUPPORT_PRICE || 2980);

    // 無料期間中はStripeを通さず success に進める
    if (isFreeMode) {
      const successUrl = new URL("/checkout/success", siteUrl);
      successUrl.searchParams.set("free", "1");
      successUrl.searchParams.set("service", "postal-support");
      successUrl.searchParams.set("amount", "0");

      return NextResponse.json({
        ok: true,
        mode: "free",
        checkoutUrl: successUrl.toString(),
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { ok: false, error: "STRIPE_SECRET_KEY が未設定です。" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: "郵送補助",
              description: "送り状PDFダウンロード・レターパック宛名作成",
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        service: "postal-support",
        sourcePage: body?.sourcePage || "/web-mail",
      },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json(
        { ok: false, error: "Stripe の決済URL取得に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "paid",
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return NextResponse.json(
      { ok: false, error: "決済セッション作成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}