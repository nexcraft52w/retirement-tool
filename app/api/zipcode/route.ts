import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawZipcode = searchParams.get("zipcode") || "";
  const zipcode = rawZipcode.replace(/\D/g, "");

  if (!zipcode) {
    return NextResponse.json({ error: "no zipcode" }, { status: 400 });
  }

  if (zipcode.length !== 7) {
    return NextResponse.json({ error: "invalid zipcode" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${encodeURIComponent(
        zipcode
      )}`,
      {
        cache: "force-cache",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "zipcode api failed" },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data?.results?.length) {
      const r = data.results[0];

      return NextResponse.json({
        address: `${r.address1}${r.address2}${r.address3}`,
      });
    }

    return NextResponse.json({ address: "" });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}