"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function FeedbackPage() {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isPublishable, setIsPublishable] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim()) {
      setError("感想を入力してください。");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.from("user_feedback").insert([
      {
        type: "feedback",
        rating: rating ? String(rating) : null,
        message: message.trim(),
        is_publishable: isPublishable, // ←ここが今回の追加
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
    setRating(null);
    setMessage("");
    setIsPublishable(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-gray-900">
          感想・フィードバック
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          実際に使ってみた感想を教えてください
        </p>

        {done && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            送信ありがとうございました
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* ★評価 */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-800">
              総合評価
            </p>

            <div className="flex gap-2 text-2xl">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  className={`${
                    rating && rating >= num
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* 感想 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-800">
              感想
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="使ってみてどうでしたか？"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* 掲載許可 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublishable}
              onChange={(e) => setIsPublishable(e.target.checked)}
            />
            <span className="text-sm text-gray-700">
              この内容を掲載してもよい
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "送信中..." : "送信する"}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-500">
          ※いただいた内容はサービス改善・掲載素材として利用する場合があります
        </div>

        <div className="mt-6">
          <Link href="/" className="text-sm text-blue-600 underline">
            前の画面に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}