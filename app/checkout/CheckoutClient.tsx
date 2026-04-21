"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canceled = searchParams.get("canceled") === "1";

  const isFreeMode =
    process.env.NEXT_PUBLIC_POSTAL_FREE_MODE === "true";

  const price = useMemo(() => {
    return isFreeMode ? 0 : 2980;
  }, [isFreeMode]);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourcePage: "/web-mail",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.checkoutUrl) {
        throw new Error(data?.error || "決済ページへ進めませんでした。");
      }

      window.location.href = data.checkoutUrl;
    } catch (e: any) {
      setError(e?.message || "エラーが発生しました。");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">郵送補助の確認</h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          この先で、
          <span className="font-semibold text-slate-900">
            送り状PDFのダウンロード
          </span>
          と
          <span className="font-semibold text-slate-900">
            レターパック宛名の作成
          </span>
          に進めます。
        </p>

        {isFreeMode ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              無料期間中です
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              現在は 0円 で次へ進めます。
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">ご利用料金</p>
            <p className="mt-1 text-3xl font-bold">¥{price.toLocaleString()}</p>
            <p className="mt-2 text-sm text-slate-500">
              郵送補助 / 1回分
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">
            このあと利用できるもの
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>・送り状PDFのダウンロード</li>
            <li>・レターパック宛名の作成</li>
            <li>・必要に応じて再ダウンロード</li>
          </ul>
        </div>

        {canceled && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            決済は完了していません。もう一度進める場合は下のボタンを押してください。
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading
            ? "進行中..."
            : isFreeMode
            ? "次へ進む"
            : "決済へ進む"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          前の画面に戻る
        </button>
      </div>
    </main>
  );
}