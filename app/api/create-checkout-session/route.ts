import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe checkout is currently disabled." },
    { status: 503 }
  );
}