"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ResultStatus = "smooth" | "minor_trouble" | "major_trouble";
type SubmitState = "idle" | "submitting" | "success" | "error";

const BAASAMA_IMAGE_BASE = "/images/taishoku-baasama";

const RESULT_OPTIONS: {
  value: ResultStatus;
  title: string;
  description: string;
}[] = [
  {
    value: "smooth",
    title: "問題なく退職できた",
    description: "書類の送付後、大きなやり取りなく進んだ",
  },
  {
    value: "minor_trouble",
    title: "少しやり取りはあったが退職できた",
    description: "確認や返却物の話など、軽い対応はあった",
  },
  {
    value: "major_trouble",
    title: "かなり揉めた・まだ不安が残った",
    description: "強い引き止め、連絡の多さ、条件面の不安などがあった",
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
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resultStatus,
          resultLabel,
          message: message.trim(),
          isPublishable,
        }),
      });

      if (!res.ok) {
        throw new Error("feedback submit failed");
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
    <main className="min-h-screen bg-[#fff8df] text-slate-900">
      <div className="w-full overflow-hidden bg-[#fff3bd]">
        <img
          src={`${BAASAMA_IMAGE_BASE}/taishoku-tool-header-banner.png`}
          alt="退職ツール"
          className="mx-auto block h-auto w-full max-w-6xl object-contain"
        />
      </div>

      <div className="px-4 py-6 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <div className="grid gap-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white sm:grid-cols-[1fr_150px] sm:items-end sm:p-7">
            <div>
              <p className="inline-flex rounded-full bg-[#fff3bd] px-3 py-1 text-xs font-bold text-slate-900">
                退職ばあ様からのお願い
              </p>
              <h1 className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
                この書類で退職できましたか？
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-100">
                退職ツールをもっと使いやすくするため、結果だけでも教えてください。
              </p>
            </div>

            <div className="flex justify-end sm:block">
              <img
                src={`${BAASAMA_IMAGE_BASE}/taishoku-baasama-half-guide.png`}
                alt="案内する退職ばあ様"
                className="h-28 w-auto object-contain sm:h-36"
              />
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {submitState === "success" ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <div className="flex gap-4">
                  <img
                    src={`${BAASAMA_IMAGE_BASE}/taishoku-baasama-half-gassho.png`}
                    alt="お礼をする退職ばあ様"
                    className="h-24 w-auto shrink-0 object-contain"
                  />
                  <div>
                    <p className="font-bold">送信しました。ありがとうございます。</p>
                    <p className="mt-2 text-sm leading-7">
                      いただいた内容は、退職ツールの改善に使わせていただきます。
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex w-full justify-center rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    作成ページへ戻る
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-3xl border border-amber-200 bg-[#fffaf0] p-4">
                  <div className="flex gap-3">
                    <img
                      src={`${BAASAMA_IMAGE_BASE}/taishoku-baasama-half-point.png`}
                      alt="指さしする退職ばあ様"
                      className="h-20 w-auto shrink-0 object-contain"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        まずは結果だけ選んでください。
                      </p>
                      <p className="mt-1 text-xs leading-6 text-slate-600">
                        詳しい感想は任意です。無理に長く書かなくて大丈夫です。
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-sm font-bold">結果を選んでください</div>

                  <div className="space-y-3">
                    {RESULT_OPTIONS.map((option) => {
                      const isChecked = resultStatus === option.value;

                      return (
                        <label
                          key={option.value}
                          className={`block cursor-pointer rounded-2xl border p-4 transition ${
                            isChecked
                              ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10"
                              : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40"
                          }`}
                        >
                          <span className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="resultStatus"
                              checked={isChecked}
                              onChange={() => setResultStatus(option.value)}
                              className="mt-1 h-4 w-4 accent-slate-900"
                            />
                            <span>
                              <span className="block text-sm font-bold text-slate-900">
                                {option.title}
                              </span>
                              <span className="mt-1 block text-xs leading-6 text-slate-600">
                                {option.description}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-message" className="text-sm font-bold">
                    感想・困ったことなど（任意）
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="例：郵送後に会社から確認の連絡が来た、返却物の案内があった、など"
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6">
                  <input
                    type="checkbox"
                    checked={isPublishable}
                    onChange={(e) => setIsPublishable(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-slate-900"
                  />
                  <span>
                    <span className="font-bold">内容を匿名で掲載してもよい</span>
                    <span className="mt-1 block text-xs text-slate-600">
                      掲載する場合も、個人名・会社名などが分かる内容は避けます。
                    </span>
                  </span>
                </label>

                {submitState === "error" && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    送信できませんでした。結果を選んでから、もう一度お試しください。
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitState === "submitting" ? "送信中..." : "結果を送信する"}
                </button>

                <div className="text-center">
                  <Link href="/" className="text-xs font-bold text-slate-600 underline underline-offset-4 hover:text-slate-900">
                    送信せず作成ページへ戻る
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
