import { NextRequest, NextResponse } from "next/server";

type ZipCloudResult = {
  zipcode: string;
  prefcode: string;
  address1: string;
  address2: string;
  address3: string;
  kana1: string;
  kana2: string;
  kana3: string;
};

type ZipCloudResponse = {
  message: string | null;
  results: ZipCloudResult[] | null;
  status: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zipcode = (searchParams.get("zipcode") || "").replace(/[^\d]/g, "");

  if (zipcode.length !== 7) {
    return NextResponse.json(
      { ok: false, message: "郵便番号は7桁で入力してください。" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: "住所検索に失敗しました。" },
        { status: 502 }
      );
    }

    const data = (await res.json()) as ZipCloudResponse;

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        ok: false,
        message: data.message || "該当する住所が見つかりませんでした。",
      });
    }

    const first = data.results[0];

    return NextResponse.json({
      ok: true,
      zipcode: first.zipcode,
      address: `${first.address1}${first.address2}${first.address3}`,
      prefecture: first.address1,
      city: first.address2,
      town: first.address3,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "住所検索中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}