"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function BugReportPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) {
      setError("不具合内容を入力してください。");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.from("user_feedback").insert([
      {
        type: "bug",
        rating: null,
        category: category || null,
        message: message.trim(),
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
      },
    ]);

    setLoading(false);

    if (error) {
      setError("送信できませんでした。時間をおいて再度お試しください。");
      return;
    }

    setDone(true);
    setCategory("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">不具合報告</h1>
        <p className="mt-2 text-sm text-gray-600">
          エラーや表示崩れがあれば、発生した状況を教えてください。
        </p>

        {done && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            報告ありがとうございました。確認に利用します。
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              不具合の種類
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
            <label className="mb-2 block text-sm font-medium text-gray-800">
              不具合内容
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="どの操作でエラーが出ましたか？（例：PDF出力ボタンを押した時）"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "送信中..." : "不具合を報告する"}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/" className="text-sm text-blue-600 underline">
            前の画面に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}