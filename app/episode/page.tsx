"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const EPISODE_BASE_PRICE = 1500;
const EPISODE_POST_DISCOUNT = 500;

const STORAGE_KEYS = {
  retirementDraft: "retirement-document-draft-v1",
  retirementHandoff: "postal-discount-handoff-v1",
  episodeHandoff: "episode-discount-handoff-v1",
  episodeDraft: "episode-page-draft-v1",
} as const;

const ROUTES = {
  top: "/",
  webMail: "/web-mail",
} as const;

const API_ENDPOINTS = {
  episodeSubmit: "/api/episode-submit",
} as const;

const MIN_PEN_NAME = 1;
const MIN_SUBJECT = 4;
const MIN_BODY = 150;
const MAX_BODY = 3000;

const PUBLIC_IMAGE_BASE = "/images/taishoku-baasama";

const IMAGE_PATHS = {
  headerBanner: `${PUBLIC_IMAGE_BASE}/taishoku-tool-header-banner.png`,
  halfGuide: `${PUBLIC_IMAGE_BASE}/taishoku-baasama-half-guide.png`,
  halfPoint: `${PUBLIC_IMAGE_BASE}/taishoku-baasama-half-point.png`,
  standingGuide: `${PUBLIC_IMAGE_BASE}/taishoku-baasama-standing-guide.png`,
} as const;

const NG_WORDS = [
  "死ね",
  "殺す",
  "殺したい",
  "住所晒す",
  "電話晒す",
  "個人情報",
  "晒す",
  "特定した",
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/;
const URL_REGEX = /https?:\/\/[^\s]+/i;
const FULL_ADDRESS_REGEX = /(都|道|府|県).{1,20}(市|区|町|村).{1,30}/;

type JudgeResult = {
  ok: boolean;
  reasons: string[];
};

type HandoffPayload = {
  discount: {
    basePrice: number;
    episodeDiscountApplied: boolean;
    totalDiscount: number;
    finalPrice: number;
  };
  episode: {
    penName: string;
    subject: string;
    body: string;
    stressRelief: string;
  };
  createdAt: string;
};

type EpisodeDraft = {
  penName: string;
  subject: string;
  body: string;
  stressRelief: string;

  judgeReasons: string[];
  submitMessage: string;

  episodeDiscountApplied: boolean;

  isSubmitted: boolean;
};

type EpisodePricingResult = {
  basePrice: number;
  episodeDiscount: number;
  totalDiscount: number;
  finalPrice: number;
};

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasNgWord(text: string) {
  const lower = text.toLowerCase();
  return NG_WORDS.find((word) => lower.includes(word.toLowerCase())) ?? null;
}

function detectPersonalInfo(text: string) {
  if (EMAIL_REGEX.test(text)) return "メールアドレスらしき記載";
  if (PHONE_REGEX.test(text)) return "電話番号らしき記載";
  if (URL_REGEX.test(text)) return "URLの記載";
  if (FULL_ADDRESS_REGEX.test(text)) return "住所らしき記載";
  return null;
}

function judgePost(
  penName: string,
  subject: string,
  body: string,
  stressRelief: string
): JudgeResult {
  const reasons: string[] = [];

  const normalizedBody = normalizeText(body);
  const normalizedStressRelief = normalizeText(stressRelief);
  const joined = `${penName}\n${subject}\n${normalizedBody}\n${normalizedStressRelief}`;

  if (penName.trim().length < MIN_PEN_NAME) {
    reasons.push("ペンネームを入力してください。");
  }

  if (subject.trim().length < MIN_SUBJECT) {
    reasons.push(`件名は${MIN_SUBJECT}文字以上で入力してください。`);
  }

  if (normalizedBody.length < MIN_BODY) {
    reasons.push(`本文は${MIN_BODY}文字以上で入力してください。`);
  }

  if (normalizedBody.length > MAX_BODY) {
    reasons.push(`本文は${MAX_BODY}文字以内にしてください。`);
  }

  const ng = hasNgWord(joined);
  if (ng) {
    reasons.push(`NGワードを含んでいます（${ng}）。`);
  }

  const personalInfo = detectPersonalInfo(joined);
  if (personalInfo) {
    reasons.push(`${personalInfo}が含まれているため投稿できません。`);
  }

  const noSpace = normalizedBody.replace(/\s/g, "");
  const uniqueChars = new Set(noSpace).size;

  if (noSpace.length >= 20 && uniqueChars <= 3) {
    reasons.push("同じ文字の繰り返しが多く、内容が薄いため投稿できません。");
  }

  if (/^(あ|a|A|１|1|w|W|笑|草)+$/.test(noSpace)) {
    reasons.push("本文の内容が短すぎます。");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

function resolveEpisodePricing(params: {
  episodeDiscountApplied: boolean;
}): EpisodePricingResult {
  const episodeDiscount = params.episodeDiscountApplied ? EPISODE_POST_DISCOUNT : 0;
  const totalDiscount = episodeDiscount;
  const finalPrice = Math.max(EPISODE_BASE_PRICE - totalDiscount, 0);

  return {
    basePrice: EPISODE_BASE_PRICE,
    episodeDiscount,
    totalDiscount,
    finalPrice,
  };
}

const INITIAL_DRAFT: EpisodeDraft = {
  penName: "",
  subject: "",
  body: "",
  stressRelief: "",

  judgeReasons: [],
  submitMessage: "",

  episodeDiscountApplied: false,

  isSubmitted: false,
};

export default function EpisodePage() {
  const router = useRouter();

  const [hasRetirementDraft, setHasRetirementDraft] = useState(false);

  const [penName, setPenName] = useState(INITIAL_DRAFT.penName);
  const [subject, setSubject] = useState(INITIAL_DRAFT.subject);
  const [body, setBody] = useState(INITIAL_DRAFT.body);
  const [stressRelief, setStressRelief] = useState(INITIAL_DRAFT.stressRelief);

  const [judgeReasons, setJudgeReasons] = useState<string[]>(INITIAL_DRAFT.judgeReasons);
  const [submitMessage, setSubmitMessage] = useState(INITIAL_DRAFT.submitMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [episodeDiscountApplied, setEpisodeDiscountApplied] = useState(
    INITIAL_DRAFT.episodeDiscountApplied
  );

  const [isSubmitted, setIsSubmitted] = useState(INITIAL_DRAFT.isSubmitted);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(STORAGE_KEYS.episodeDraft);
      if (!savedDraft) return;

      const parsed = JSON.parse(savedDraft) as Partial<EpisodeDraft>;
      const restoredSubmitted = Boolean(parsed.isSubmitted);

      setPenName(parsed.penName ?? "");
      setSubject(parsed.subject ?? "");
      setBody(parsed.body ?? "");
      setStressRelief(parsed.stressRelief ?? "");

      setJudgeReasons(Array.isArray(parsed.judgeReasons) ? parsed.judgeReasons : []);
      setSubmitMessage(
        restoredSubmitted
          ? "投稿は完了しています。必要であればこのまま郵送補助へ進めます。"
          : parsed.submitMessage ?? ""
      );

      setEpisodeDiscountApplied(Boolean(parsed.episodeDiscountApplied));
      setIsSubmitted(restoredSubmitted);
    } catch (error) {
      console.error("failed to restore episode draft", error);
    }
  }, []);

  useEffect(() => {
    try {
      const hasHandoff = Boolean(sessionStorage.getItem(STORAGE_KEYS.retirementHandoff));
      const hasDraft = Boolean(sessionStorage.getItem(STORAGE_KEYS.retirementDraft));
      setHasRetirementDraft(hasHandoff || hasDraft);
    } catch (error) {
      console.error("failed to check retirement draft", error);
    }
  }, []);

  useEffect(() => {
    try {
      const draft: EpisodeDraft = {
        penName,
        subject,
        body,
        stressRelief,

        judgeReasons,
        submitMessage,

        episodeDiscountApplied,

        isSubmitted,
      };

      sessionStorage.setItem(STORAGE_KEYS.episodeDraft, JSON.stringify(draft));
    } catch (error) {
      console.error("failed to save episode draft", error);
    }
  }, [
    penName,
    subject,
    body,
    stressRelief,
    judgeReasons,
    submitMessage,
    episodeDiscountApplied,
    isSubmitted,
  ]);

  const pricing = useMemo(() => {
    return resolveEpisodePricing({
      episodeDiscountApplied,
    });
  }, [episodeDiscountApplied]);

  const subjectCount = subject.trim().length;
  const bodyCount = normalizeText(body).length;
  const submitDisabled = isSubmitting || isSubmitted;

  const buildHandoffPayload = (): HandoffPayload => {
    return {
      discount: {
        basePrice: pricing.basePrice,
        episodeDiscountApplied,
        totalDiscount: pricing.totalDiscount,
        finalPrice: pricing.finalPrice,
      },
      episode: {
        penName,
        subject,
        body,
        stressRelief,
      },
      createdAt: new Date().toISOString(),
    };
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;

    setIsSubmitting(true);
    setSubmitMessage("");
    setJudgeReasons([]);

    try {
      const result = judgePost(penName, subject, body, stressRelief);

      if (!result.ok) {
        setJudgeReasons(result.reasons);
        return;
      }

      const nextEpisodeDiscountApplied = true;
      const nextPricing = resolveEpisodePricing({
        episodeDiscountApplied: nextEpisodeDiscountApplied,
      });

      const response = await fetch(API_ENDPOINTS.episodeSubmit, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          penName,
          title: subject,
          body,
          stressRelief,
          discountType: "post",
          discountAmount: nextPricing.totalDiscount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitMessage(data.error || "投稿の保存に失敗しました。");
        return;
      }

      setEpisodeDiscountApplied(nextEpisodeDiscountApplied);
      setIsSubmitted(true);

      setSubmitMessage(
        `自動審査に通過しました。${nextPricing.totalDiscount}円引きが適用されました。必要であればこのまま郵送補助へ進めます。`
      );
    } catch (error) {
      console.error("episode submit error:", error);
      setSubmitMessage("投稿処理に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToWebMail = () => {
    if (!isSubmitted) return;

    try {
      const payload = buildHandoffPayload();
      sessionStorage.setItem(STORAGE_KEYS.episodeHandoff, JSON.stringify(payload));
      router.push(ROUTES.webMail);
    } catch (error) {
      console.error("failed to save handoff payload", error);
      setSubmitMessage("次ページへの情報引き継ぎに失敗しました。もう一度お試しください。");
    }
  };

  const handleBackToDocument = () => {
    router.push(ROUTES.top);
  };

  const handleReset = () => {
    setPenName("");
    setSubject("");
    setBody("");
    setStressRelief("");

    setJudgeReasons([]);
    setSubmitMessage("");

    setEpisodeDiscountApplied(false);
    setIsSubmitted(false);

    try {
      sessionStorage.removeItem(STORAGE_KEYS.episodeDraft);
    } catch (error) {
      console.error("failed to clear episode draft", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <img
            src={IMAGE_PATHS.headerBanner}
            alt="退職ツール"
            className="block h-auto w-full"
          />
        </div>

        <div className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex min-h-[170px]">
            <div className="min-w-0 flex-1 p-5 pr-2 sm:p-6">
              <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                退職ばあ様の投稿案内
              </div>

              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                退職エピソード投稿
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                投稿内容と割引情報を整理したうえで、次の郵送補助ページへ引き継ぎます。
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                投稿内容は、将来的に当HPへの掲載や動画化などに利用させていただく可能性があります。
              </p>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                書ける範囲で大丈夫です。掲載・SNS・動画等で使用する際は、個人名・会社名など特定につながる情報を伏せて利用します。
              </div>
            </div>

            <div className="relative w-[92px] flex-none overflow-hidden bg-gradient-to-br from-sky-50 via-white to-amber-50 sm:w-[140px] lg:w-[220px]">
              <img
                src={IMAGE_PATHS.halfGuide}
                alt="退職ばあ様"
                className="absolute bottom-0 right-[-10px] h-[145px] w-auto max-w-none object-contain sm:right-1 sm:h-[170px] lg:right-5 lg:h-[220px]"
              />
            </div>
          </div>
        </div>

        {!hasRetirementDraft && (
          <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm leading-6 text-amber-800">
              退職届ページの入力内容が見つかりませんでした。先に退職届を作成してから進むと、割引情報の引き継ぎがスムーズです。
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-6 text-slate-600">
                <div className="font-semibold text-slate-800">投稿前の確認</div>
                <div className="mt-1">
                  ※件名は{MIN_SUBJECT}文字以上・本文は{MIN_BODY}文字以上。暴言、個人情報、URLは投稿できません。
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  ペンネーム
                </label>
                <input
                  type="text"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  placeholder="例：退職検討中A"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  件名
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例：退職理由"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-slate-500"
                />
                <div className="mt-2 text-xs text-slate-500">
                  {subjectCount}文字 / {MIN_SUBJECT}文字以上
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  本文
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="職場で何がつらかったか、なぜ辞めようと思ったか、その後どう感じたかを具体的に書いてください。"
                  rows={12}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base leading-7 outline-none transition focus:border-slate-500"
                />
                <div className="mt-2 text-xs text-slate-500">
                  {bodyCount}文字 / {MIN_BODY}〜{MAX_BODY}文字
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  職場で感じたストレスの発散方法（任意）
                </label>
                <textarea
                  value={stressRelief}
                  onChange={(e) => setStressRelief(e.target.value)}
                  placeholder="例：散歩、音楽、睡眠、友人との会話 など"
                  rows={5}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-base leading-7 outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                <div className="font-semibold text-emerald-900">
                  エピソード投稿で500円引き
                </div>
                <div className="mt-1">
                  投稿が自動審査を通過すると、郵送補助料金が1,500円から1,000円になります。
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitDisabled}
                  className={`rounded-2xl px-6 py-3 text-base font-semibold text-white transition ${
                    submitDisabled
                      ? "cursor-not-allowed bg-slate-400"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {isSubmitted
                    ? "投稿済み"
                    : isSubmitting
                    ? "審査中..."
                    : "投稿して500円引きを適用する"}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  リセット
                </button>
              </div>

              {judgeReasons.length > 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="mb-2 font-semibold text-red-700">
                    自動審査で投稿できませんでした
                  </div>
                  <ul className="space-y-1 text-sm leading-6 text-red-700">
                    {judgeReasons.map((reason, index) => (
                      <li key={index}>・{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {submitMessage && !isSubmitted && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="font-semibold text-emerald-700">{submitMessage}</div>
                </div>
              )}

              {isSubmitted && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="font-semibold text-emerald-700">
                    投稿は完了しています。必要であればこのまま郵送補助へ進めます。
                  </div>

                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    ※割引を適用する場合は、このまま「郵送補助へ進む」を押してください。<br />
                    退職届ページへ戻ると、割引情報が正しく引き継がれない場合があります。
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleGoToWebMail}
                      className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      割引を引き継いで郵送補助へ進む
                    </button>

                    <button
                      type="button"
                      onClick={handleBackToDocument}
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      退職届ページへ戻る
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-500">郵送補助の料金</div>

              <div className="mt-3 flex items-end gap-3">
                <div className="text-lg text-slate-400 line-through">
                  {pricing.basePrice.toLocaleString()}円
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  {pricing.finalPrice.toLocaleString()}円
                </div>
              </div>

              <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6">
                <div className={episodeDiscountApplied ? "text-slate-800" : "text-slate-400"}>
                  エピソード投稿 割引：-{EPISODE_POST_DISCOUNT}円
                  {!episodeDiscountApplied && "（未適用）"}
                </div>

                <div className="border-t pt-2 font-semibold text-slate-900">
                  現在の郵送補助料金：{pricing.finalPrice.toLocaleString()}円
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                ※エピソード投稿自体は無料です。<br />
                ※料金がかかるのは、郵送補助を利用する場合のみです。
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm leading-6 text-amber-800">
                このページでは割引を一時表示しています。投稿完了後に進む場合のみ、次ページへ情報を引き継ぎます。
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">退職エピソード集</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                投稿されたエピソードをまとめた一覧ページです。運用開始後に公開予定です。
              </p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                <div className="flex items-end gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">退職ばあ様より</div>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      退職エピソード集は準備中です。公開まで、もう少し待っていてくださいね。
                    </p>
                  </div>

                  <img
                    src={IMAGE_PATHS.halfPoint}
                    alt="退職ばあ様"
                    className="h-[100px] w-auto flex-none object-contain sm:h-[120px]"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
              >
                退職エピソード集を見る（coming soon）
              </button>
            </section>

            <section className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:block">
              <div className="rounded-t-3xl bg-amber-50 px-6 py-4">
                <div className="text-sm font-semibold text-slate-900">退職ばあ様より</div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  ここまで入力できたら、あとは投稿内容を確認して進めてくださいね。
                </p>
              </div>

              <div className="flex justify-center bg-gradient-to-b from-white via-sky-50 to-amber-50 pt-6">
                <img
                  src={IMAGE_PATHS.standingGuide}
                  alt="退職ばあ様"
                  className="h-[500px] w-auto object-contain"
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
