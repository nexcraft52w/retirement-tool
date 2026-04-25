import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPostalPlan, getPostalPrice } from "@/lib/postalPricing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const isFreeMode =
      process.env.NEXT_PUBLIC_POSTAL_FREE_MODE === "true";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const plan = getPostalPlan(body?.plan);
    const priceDecision = getPostalPrice(plan, isFreeMode);

    if (isFreeMode) {
      const readyUrl = new URL("/postal-ready", siteUrl);
      readyUrl.searchParams.set("free", "1");
      readyUrl.searchParams.set("plan", priceDecision.plan);

      return NextResponse.json({
        ok: true,
        mode: "free",
        checkoutUrl: readyUrl.toString(),
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
              name: `郵送補助（${priceDecision.label}）`,
              description: "送り状PDFダウンロード・レターパック宛名作成",
            },
            unit_amount: priceDecision.amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        service: "postal-support",
        sourcePage: body?.sourcePage || "/checkout",
        plan: priceDecision.plan,
        planLabel: priceDecision.label,
        amount: String(priceDecision.amount),
      },
      success_url: `${siteUrl}/postal-ready?paid=1&plan=${priceDecision.plan}`,
      cancel_url: `${siteUrl}/checkout?canceled=1&plan=${priceDecision.plan}`,
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