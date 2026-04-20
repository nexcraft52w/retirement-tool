import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const zipcode = searchParams.get("zipcode");

  if (!zipcode) {
    return NextResponse.json({ error: "no zipcode" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
    );
    const data = await res.json();

    if (data.results) {
      const r = data.results[0];
      return NextResponse.json({
        address: `${r.address1}${r.address2}${r.address3}`,
      });
    } else {
      return NextResponse.json({ address: "" });
    }
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}