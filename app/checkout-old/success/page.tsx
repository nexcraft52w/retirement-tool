"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();

  const isFree = searchParams.get("free") === "1";
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          {isFree ? "無料期間のため、そのまま進めます" : "手続きが完了しました"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          このページから、
          <span className="font-semibold text-slate-900">
            送り状PDFのダウンロード
          </span>
          と
          <span className="font-semibold text-slate-900">
            レターパック宛名の作成
          </span>
          に進めます。
        </p>

        {!isFree && sessionId && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            決済確認ID: {sessionId}
          </div>
        )}

        <div className="mt-6 grid gap-4">
          <Link
            href="/web-mail/download"
            className="rounded-xl bg-blue-600 px-4 py-4 text-center text-base font-semibold text-white transition hover:bg-blue-700"
          >
            送り状PDFをダウンロード
          </Link>

          <Link
            href="/letterpack"
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-center text-base font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            レターパック宛名を作成する
          </Link>
        </div>

        <p className="mt-5 text-xs leading-6 text-slate-500">
          ※ 送り状ダウンロードを先に押す必要はありません。必要な方から進めます。
        </p>
      </div>
    </main>
  );
}