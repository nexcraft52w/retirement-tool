"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const BAASAMA_IMAGE_BASE = "/images/taishoku-baasama";

export default function BugReportPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!message.trim()) {
      setError("不具合内容を入力してください。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pagePath: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        setError("送信できませんでした。時間をおいて再度お試しください。");
        return;
      }

      setDone(true);
      setCategory("");
      setMessage("");
    } catch {
      setError("送信できませんでした。通信状況を確認して再度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="w-full overflow-hidden bg-[#fff7d6]">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <Link href="/" aria-label="退職ツールのトップへ戻る">
            <Image
              src={`${BAASAMA_IMAGE_BASE}/taishoku-tool-header-banner.png`}
              alt="退職ツール"
              width={1200}
              height={220}
              priority
              className="h-auto w-full rounded-2xl object-contain"
            />
          </Link>
        </div>
      </div>

      <section className="px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#fff8df] via-white to-[#eaf6ff] px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.18em] text-sky-700">
                  退職ばあ様の案内
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-950">
                  不具合報告
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  エラーや表示崩れがあれば、発生した状況を教えてください。
                </p>
              </div>

              <Image
                src={`${BAASAMA_IMAGE_BASE}/taishoku-baasama-half-guide.png`}
                alt="案内する退職ばあ様"
                width={130}
                height={130}
                className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700">
              うまく動かなかった場所だけ、短く書いてくれれば大丈夫です。
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {done && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                報告ありがとうございました。確認に利用します。
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="bug-category"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  不具合の種類
                </label>
                <select
                  id="bug-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">選択してください（任意）</option>
                  <option value="pdf">PDF出力</option>
                  <option value="postal">郵送ページ</option>
                  <option value="save">保存・引き継ぎ</option>
                  <option value="layout">表示崩れ</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="bug-message"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  不具合内容
                </label>
                <textarea
                  id="bug-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="どの操作でエラーが出ましたか？（例：PDF出力ボタンを押した時）"
                  className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "送信中..." : "不具合を報告する"}
              </button>
            </form>

            <div className="mt-6">
              <Link
                href="/"
                className="text-sm font-medium text-sky-700 underline underline-offset-4 hover:text-sky-900"
              >
                前の画面に戻る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
