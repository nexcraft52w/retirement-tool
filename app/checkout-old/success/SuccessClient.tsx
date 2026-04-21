"use client";

import { useSearchParams } from "next/navigation";

export default function SuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">決済完了</h1>
        <p className="mt-3 text-sm text-slate-600">
          決済が完了しました。
        </p>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          session_id: {sessionId || "取得できませんでした"}
        </div>
      </div>
    </main>
  );
}