"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ResultStatus = "smooth" | "minor_trouble" | "major_trouble";
type SubmitState = "idle" | "submitting" | "success" | "error";

const RESULT_OPTIONS: {
  value: ResultStatus;
  title: string;
}[] = [
  { value: "smooth", title: "問題なく退職" },
  { value: "minor_trouble", title: "少しトラブルがあったが、退職" },
  { value: "major_trouble", title: "かなり揉めた" },
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
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resultStatus,
          message,
          isPublishable,
        }),
      });

      if (!res.ok) {
        throw new Error();
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
            <div className="mt-6">
              <Link href="/" className="inline-flex w-full justify-center rounded-2xl bg-blue-600 px-5 py-4 text-white">
                作成ページへ戻る
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <div className="mb-3 text-sm font-semibold">結果を選んでください</div>

              {RESULT_OPTIONS.map((option) => (
                <label key={option.value} className="block border rounded-2xl p-4 mb-2">
                  <input
                    type="radio"
                    checked={resultStatus === option.value}
                    onChange={() => setResultStatus(option.value)}
                  />
                  <span className="ml-2">{option.title}</span>
                </label>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="任意"
              className="w-full border rounded-2xl p-3"
            />

            <label>
              <input
                type="checkbox"
                checked={isPublishable}
                onChange={(e) => setIsPublishable(e.target.checked)}
              />
              掲載OK
            </label>

            {submitState === "error" && (
              <div className="text-red-600">送信失敗</div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-2xl"
            >
              {submitState === "submitting" ? "送信中..." : "送信"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}