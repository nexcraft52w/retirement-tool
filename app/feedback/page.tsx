"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type ResultStatus = "smooth" | "minor_trouble" | "major_trouble";

type SubmitState = "idle" | "submitting" | "success" | "error";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RESULT_OPTIONS: {
  value: ResultStatus;
  title: string;
}[] = [
  {
    value: "smooth",
    title: "問題なく退職",
  },
  {
    value: "minor_trouble",
    title: "少しトラブルがあったが、退職",
  },
  {
    value: "major_trouble",
    title: "かなり揉めた",
  },
];

export default function FeedbackPage() {
  const [resultStatus, setResultStatus] = useState<ResultStatus | "">("");
  const [message, setMessage] = useState("");
  const [isPublishable, setIsPublishable] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const canSubmit = useMemo(() => {
    return resultStatus !== "" && submitState !== "submitting";
  }, [resultStatus, submitState]);

  const resultLabel = useMemo(() => {
    return RESULT_OPTIONS.find((item) => item.value === resultStatus)?.title ?? "";
  }, [resultStatus]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!resultStatus) {
      setSubmitState("error");
      return;
    }

    setSubmitState("submitting");

    try {
      const { error } = await supabase.from("user_feedback").insert([
        {
          type: "feedback",
          rating: resultStatus,
          category: "retirement_result",
          message: message.trim() || resultLabel,
          page_path: "/feedback",
          is_publishable: isPublishable,
        },
      ]);

      if (error) {
        throw error;
      }

      setSubmitState("success");
      setResultStatus("");
      setMessage("");
      setIsPublishable(false);
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-5">
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
            この書類で退職できましたか？
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            今後のサービス改善のため、結果を教えてください。
          </p>
        </div>

        {submitState === "success" ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="font-semibold">送信しました。</p>
            <p className="mt-2 text-sm leading-7">
              ご協力ありがとうございます。いただいた内容は、サービス改善や掲載素材として確認します。
            </p>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-4 text-center font-semibold text-white hover:bg-blue-700"
              >
                作成ページへ戻る
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="mb-3 text-sm font-semibold text-slate-800">
                結果を選んでください
              </div>

              <div className="space-y-2">
                {RESULT_OPTIONS.map((option) => {
                  const selected = resultStatus === option.value;

                  return (
                    <label
                      key={option.value}
                      className={`block cursor-pointer rounded-2xl border px-4 py-4 transition ${
                        selected
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="resultStatus"
                          value={option.value}
                          checked={selected}
                          onChange={() => setResultStatus(option.value)}
                          className="h-4 w-4 accent-blue-600"
                        />
                        <div className="font-semibold text-slate-900">
                          {option.title}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {submitState === "error" && !resultStatus && (
                <p className="mt-2 text-sm text-red-600">
                  いずれかを選択してください。
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">
                一言あれば教えてください
                <span className="ml-1 font-normal text-slate-400">任意</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="例：会社から確認の電話がありましたが、問題なく退職できました。"
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={isPublishable}
                onChange={(e) => setIsPublishable(e.target.checked)}
                className="mt-1 h-4 w-4 accent-blue-600"
              />
              <span className="text-sm leading-6 text-slate-700">
                掲載OK
                <span className="block text-xs text-slate-500">
                  個人名・会社名などは掲載しません。
                </span>
              </span>
            </label>

            {submitState === "error" && resultStatus && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
                送信できませんでした。時間をおいて再度お試しください。
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full rounded-2xl py-4 text-center text-lg font-semibold shadow ${
                canSubmit
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                  : "cursor-not-allowed bg-slate-300 text-slate-500"
              }`}
            >
              {submitState === "submitting" ? "送信中..." : "結果を送信"}
            </button>

            <p className="text-xs leading-6 text-slate-500">
              ※いただいた内容は、サービス改善・匿名での掲載素材として利用する場合があります。
            </p>

            <div className="text-center">
              <Link href="/" className="text-sm font-medium text-blue-700 underline">
                前の画面に戻る
              </Link>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
