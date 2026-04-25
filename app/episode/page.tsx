"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const EPISODE_BASE_PRICE = 1500;
const EPISODE_POST_DISCOUNT = 300;
const AI_POLISH_DISCOUNT = 200;

const RETIREMENT_DRAFT_KEY = "retirement-document-draft-v1";
const RETIREMENT_HANDOFF_KEY = "postal-discount-handoff-v1";
const EPISODE_HANDOFF_KEY = "episode-discount-handoff-v1";
const EPISODE_DRAFT_KEY = "episode-page-draft-v1";

const MIN_PEN_NAME = 1;
const MIN_SUBJECT = 4;
const MIN_BODY = 150;
const MAX_BODY = 3000;
const MAX_AI_POLISH_TRIES = 999;

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

type PolishResponse = {
  subjectPolished?: string;
  bodyPolished?: string;
  stressReliefPolished?: string;
  anonymousCheckNote?: string;
  error?: string;
};

type EpisodeSnapshot = {
  penName: string;
  subject: string;
  body: string;
  stressRelief: string;
};

type RetirementFormData = {
  name?: string;
  address?: string;
  department?: string;
  companyName?: string;
  companyAddress?: string;
  representativeName?: string;
  retirementDate?: string;
};

type RetirementDraftPayload = {
  documentType?: "wish" | "notice";
  form?: RetirementFormData;
};

type RetirementHandoffPayload = {
  sourcePage?: string;
  returnPath?: string;
  documentType?: "wish" | "notice";
  documentTitle?: string;
  companyName?: string;
  senderName?: string;
  senderDepartment?: string;
  senderAddress?: string;
  companyAddress?: string;
  representativeName?: string;
  retirementDate?: string;
  basePrice?: number;
  discountMin?: number;
  discountMax?: number;
  discountedPriceMin?: number;
  discountedPriceMax?: number;
  episodePosted?: boolean;
  canGoBack?: boolean;
  updatedAt?: string;
};

type HandoffPayload = {
  discount: {
    basePrice: number;
    episodeDiscountApplied: boolean;
    aiPolishDiscountApplied: boolean;
    totalDiscount: number;
    finalPrice: number;
  };
  episode: {
    penName: string;
    subject: string;
    body: string;
    stressRelief: string;
    aiPolishExecuted: boolean;
    aiPolishAdopted: boolean;
    anonymousCheckNote: string;
    aiPolishedBody: string;
    companyName: string;
  };
  retirementForm: RetirementFormData;
  createdAt: string;
};

type EpisodeDraft = {
  penName: string;
  subject: string;
  body: string;
  stressRelief: string;

  subjectPreview: string;
  normalizedPreview: string;
  normalizedStressPreview: string;
  anonymousCheckNote: string;

  judgeReasons: string[];
  submitMessage: string;

  episodeDiscountApplied: boolean;
  aiPolishDiscountApplied: boolean;

  aiPolishExecuted: boolean;
  aiPolishAdopted: boolean;
  aiPolishTryCount: number;

  originalSnapshot: EpisodeSnapshot | null;
  polishedSnapshot: EpisodeSnapshot | null;

  isSubmitted: boolean;
};

type EpisodePricingResult = {
  basePrice: number;
  episodeDiscount: number;
  aiPolishDiscount: number;
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
  aiPolishDiscountApplied: boolean;
}): EpisodePricingResult {
  const episodeDiscount = params.episodeDiscountApplied ? EPISODE_POST_DISCOUNT : 0;
  const aiPolishDiscount = params.aiPolishDiscountApplied ? AI_POLISH_DISCOUNT : 0;
  const totalDiscount = episodeDiscount + aiPolishDiscount;
  const finalPrice = Math.max(EPISODE_BASE_PRICE - totalDiscount, 0);

  return {
    basePrice: EPISODE_BASE_PRICE,
    episodeDiscount,
    aiPolishDiscount,
    totalDiscount,
    finalPrice,
  };
}

const INITIAL_DRAFT: EpisodeDraft = {
  penName: "",
  subject: "",
  body: "",
  stressRelief: "",

  subjectPreview: "",
  normalizedPreview: "",
  normalizedStressPreview: "",
  anonymousCheckNote: "",

  judgeReasons: [],
  submitMessage: "",

  episodeDiscountApplied: false,
  aiPolishDiscountApplied: false,

  aiPolishExecuted: false,
  aiPolishAdopted: false,
  aiPolishTryCount: 0,

  originalSnapshot: null,
  polishedSnapshot: null,

  isSubmitted: false,
};

export default function EpisodePage() {
  const router = useRouter();

  const [retirementForm, setRetirementForm] = useState<RetirementFormData | null>(null);

  const [penName, setPenName] = useState(INITIAL_DRAFT.penName);
  const [subject, setSubject] = useState(INITIAL_DRAFT.subject);
  const [body, setBody] = useState(INITIAL_DRAFT.body);
  const [stressRelief, setStressRelief] = useState(INITIAL_DRAFT.stressRelief);

  const [subjectPreview, setSubjectPreview] = useState(INITIAL_DRAFT.subjectPreview);
  const [normalizedPreview, setNormalizedPreview] = useState(
    INITIAL_DRAFT.normalizedPreview
  );
  const [normalizedStressPreview, setNormalizedStressPreview] = useState(
    INITIAL_DRAFT.normalizedStressPreview
  );
  const [anonymousCheckNote, setAnonymousCheckNote] = useState(
    INITIAL_DRAFT.anonymousCheckNote
  );

  const [judgeReasons, setJudgeReasons] = useState<string[]>(INITIAL_DRAFT.judgeReasons);
  const [submitMessage, setSubmitMessage] = useState(INITIAL_DRAFT.submitMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState("");

  const [episodeDiscountApplied, setEpisodeDiscountApplied] = useState(
    INITIAL_DRAFT.episodeDiscountApplied
  );
  const [aiPolishDiscountApplied, setAiPolishDiscountApplied] = useState(
    INITIAL_DRAFT.aiPolishDiscountApplied
  );

  const [aiPolishExecuted, setAiPolishExecuted] = useState(
    INITIAL_DRAFT.aiPolishExecuted
  );
  const [aiPolishAdopted, setAiPolishAdopted] = useState(
    INITIAL_DRAFT.aiPolishAdopted
  );
  const [aiPolishTryCount, setAiPolishTryCount] = useState(
    INITIAL_DRAFT.aiPolishTryCount
  );

  const [originalSnapshot, setOriginalSnapshot] = useState<EpisodeSnapshot | null>(
    INITIAL_DRAFT.originalSnapshot
  );
  const [polishedSnapshot, setPolishedSnapshot] = useState<EpisodeSnapshot | null>(
    INITIAL_DRAFT.polishedSnapshot
  );

  const [isSubmitted, setIsSubmitted] = useState(INITIAL_DRAFT.isSubmitted);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(EPISODE_DRAFT_KEY);
      if (!savedDraft) return;

      const parsed = JSON.parse(savedDraft) as EpisodeDraft;
      const restoredSubmitted = Boolean(parsed.isSubmitted);

      setPenName(parsed.penName ?? "");
      setSubject(parsed.subject ?? "");
      setBody(parsed.body ?? "");
      setStressRelief(parsed.stressRelief ?? "");

      setAnonymousCheckNote(parsed.anonymousCheckNote ?? "");

      setJudgeReasons(Array.isArray(parsed.judgeReasons) ? parsed.judgeReasons : []);
      setSubmitMessage(
        restoredSubmitted
          ? "投稿は完了しています。必要であればこのまま郵送補助へ進めます。"
          : parsed.submitMessage ?? ""
      );

      setEpisodeDiscountApplied(Boolean(parsed.episodeDiscountApplied));
      setAiPolishDiscountApplied(Boolean(parsed.aiPolishDiscountApplied) && restoredSubmitted);

      setAiPolishExecuted(false);
      setAiPolishAdopted(false);
      setAiPolishTryCount(0);

      setSubjectPreview("");
      setNormalizedPreview("");
      setNormalizedStressPreview("");

      setOriginalSnapshot(null);
      setPolishedSnapshot(null);

      setIsSubmitted(restoredSubmitted);
    } catch (error) {
      console.error("failed to restore episode draft", error);
    }
  }, []);

  useEffect(() => {
    try {
      const handoffRaw = sessionStorage.getItem(RETIREMENT_HANDOFF_KEY);
      if (handoffRaw) {
        const handoff = JSON.parse(handoffRaw) as RetirementHandoffPayload;
        setRetirementForm({
          name: handoff.senderName ?? "",
          address: handoff.senderAddress ?? "",
          department: handoff.senderDepartment ?? "",
          companyName: handoff.companyName ?? "",
          companyAddress: handoff.companyAddress ?? "",
          representativeName: handoff.representativeName ?? "",
          retirementDate: handoff.retirementDate ?? "",
        });
        return;
      }

      const draftRaw = sessionStorage.getItem(RETIREMENT_DRAFT_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw) as RetirementDraftPayload;
        setRetirementForm(draft.form ?? {});
      }
    } catch (error) {
      console.error("failed to load retirement form", error);
    }
  }, []);

  useEffect(() => {
    try {
      const draft: EpisodeDraft = {
        penName,
        subject,
        body,
        stressRelief,

        subjectPreview,
        normalizedPreview,
        normalizedStressPreview,
        anonymousCheckNote,

        judgeReasons,
        submitMessage,

        episodeDiscountApplied,
        aiPolishDiscountApplied,

        aiPolishExecuted,
        aiPolishAdopted,
        aiPolishTryCount,

        originalSnapshot,
        polishedSnapshot,

        isSubmitted,
      };

      sessionStorage.setItem(EPISODE_DRAFT_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error("failed to save episode draft", error);
    }
  }, [
    penName,
    subject,
    body,
    stressRelief,
    subjectPreview,
    normalizedPreview,
    normalizedStressPreview,
    anonymousCheckNote,
    judgeReasons,
    submitMessage,
    episodeDiscountApplied,
    aiPolishDiscountApplied,
    aiPolishExecuted,
    aiPolishAdopted,
    aiPolishTryCount,
    originalSnapshot,
    polishedSnapshot,
    isSubmitted,
  ]);

  const pricing = useMemo(() => {
    return resolveEpisodePricing({
      episodeDiscountApplied,
      aiPolishDiscountApplied,
    });
  }, [episodeDiscountApplied, aiPolishDiscountApplied]);

  const subjectCount = subject.trim().length;
  const bodyCount = normalizeText(body).length;
  const canTryAiPolish =
    !isPolishing &&
    !isSubmitted &&
    normalizeText(body).length > 0 &&
    aiPolishTryCount < MAX_AI_POLISH_TRIES &&
    !aiPolishExecuted;
  const companyName = retirementForm?.companyName?.trim() || "";
  const submitDisabled = isSubmitting || isSubmitted;

  const aiPolishedBody = polishedSnapshot?.body?.trim() || "";
  const aiPolishedSubject = polishedSnapshot?.subject?.trim() || "";
  const aiPolishedStressRelief = polishedSnapshot?.stressRelief?.trim() || "";

  const handleAiPolishPreview = async () => {
    if (!canTryAiPolish || isPolishing) return;

    setIsPolishing(true);
    setPolishError("");
    setSubmitMessage("");
    setJudgeReasons([]);

    try {
      const currentSnapshot: EpisodeSnapshot = {
        penName,
        subject,
        body,
        stressRelief,
      };

      const res = await fetch("/api/episode-polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentSnapshot),
      });

      const data: PolishResponse = await res.json();

      if (!res.ok) {
        setPolishError(data?.error || "AI整形に失敗しました。");
        return;
      }

      const nextPolishedSnapshot: EpisodeSnapshot = {
        penName,
        subject: data.subjectPolished || subject,
        body: data.bodyPolished || body,
        stressRelief: data.stressReliefPolished || stressRelief,
      };

      setOriginalSnapshot(currentSnapshot);
      setPolishedSnapshot(nextPolishedSnapshot);

      setSubjectPreview(nextPolishedSnapshot.subject);
      setNormalizedPreview(nextPolishedSnapshot.body);
      setNormalizedStressPreview(nextPolishedSnapshot.stressRelief);
      setAnonymousCheckNote(data.anonymousCheckNote || "");

      setAiPolishExecuted(true);
      setAiPolishAdopted(false);
      setAiPolishDiscountApplied(false);
      setAiPolishTryCount((prev) => prev + 1);
      setPolishError("");
    } catch (error) {
      console.error(error);
      setPolishError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleAdoptPolish = () => {
    if (!polishedSnapshot) return;

    setAiPolishAdopted(true);
    setAiPolishDiscountApplied(true);
    setPolishError("");
  };

  const handleRevertPolish = () => {
    setAiPolishAdopted(false);
    setAiPolishDiscountApplied(false);
    setPolishError("");
  };

  const buildHandoffPayload = (): HandoffPayload => {
    return {
      discount: {
        basePrice: pricing.basePrice,
        episodeDiscountApplied,
        aiPolishDiscountApplied,
        totalDiscount: pricing.totalDiscount,
        finalPrice: pricing.finalPrice,
      },
      episode: {
        penName,
        subject,
        body,
        stressRelief,
        aiPolishExecuted,
        aiPolishAdopted,
        anonymousCheckNote,
        aiPolishedBody,
        companyName,
      },
      retirementForm: retirementForm || {},
      createdAt: new Date().toISOString(),
    };
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;

    setIsSubmitting(true);
    setSubmitMessage("");
    setJudgeReasons([]);
    setPolishError("");

    try {
      const result = judgePost(penName, subject, body, stressRelief);

      if (!result.ok) {
        setJudgeReasons(result.reasons);
        return;
      }

      const nextEpisodeDiscountApplied = true;
      const nextAiPolishDiscountApplied = aiPolishAdopted;
      const nextPricing = resolveEpisodePricing({
        episodeDiscountApplied: nextEpisodeDiscountApplied,
        aiPolishDiscountApplied: nextAiPolishDiscountApplied,
      });

      const response = await fetch("/api/episode-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          penName,
          title: subject,
          body,
          stressRelief,
          aiPolishedTitle: aiPolishAdopted ? aiPolishedSubject : "",
          aiPolishedBody: aiPolishAdopted ? aiPolishedBody : "",
          aiPolishedStressRelief: aiPolishAdopted ? aiPolishedStressRelief : "",
          companyName,
          discountType: aiPolishAdopted ? "post_and_polish" : "post",
          discountAmount: nextPricing.totalDiscount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitMessage(data.error || "投稿の保存に失敗しました。");
        return;
      }

      setEpisodeDiscountApplied(nextEpisodeDiscountApplied);
      setAiPolishDiscountApplied(nextAiPolishDiscountApplied);
      setIsSubmitted(true);

      setSubmitMessage(
        nextAiPolishDiscountApplied
          ? `自動審査に通過しました。合計${nextPricing.totalDiscount}円引きが適用されました。必要であればこのまま郵送補助へ進めます。`
          : `自動審査に通過しました。${nextPricing.totalDiscount}円引きが適用されました。必要であればこのまま郵送補助へ進めます。`
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
      sessionStorage.setItem(EPISODE_HANDOFF_KEY, JSON.stringify(payload));
      router.push("/web-mail");
    } catch (error) {
      console.error("failed to save handoff payload", error);
      setSubmitMessage("次ページへの情報引き継ぎに失敗しました。もう一度お試しください。");
    }
  };

  const handleBackToDocument = () => {
    router.push("/");
  };

  const handleReset = () => {
    setPenName("");
    setSubject("");
    setBody("");
    setStressRelief("");

    setSubjectPreview("");
    setNormalizedPreview("");
    setNormalizedStressPreview("");
    setAnonymousCheckNote("");

    setJudgeReasons([]);
    setSubmitMessage("");
    setPolishError("");

    setEpisodeDiscountApplied(false);
    setAiPolishDiscountApplied(false);

    setAiPolishExecuted(false);
    setAiPolishAdopted(false);
    setAiPolishTryCount(0);

    setOriginalSnapshot(null);
    setPolishedSnapshot(null);

    setIsSubmitted(false);

    try {
      sessionStorage.removeItem(EPISODE_DRAFT_KEY);
    } catch (error) {
      console.error("failed to clear episode draft", error);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">退職エピソード投稿</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            退職届作成ページの情報を受け取り、割引情報を整理したうえで、次の郵送補助ページへ引き継ぎます。
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            投稿内容は、将来的に当HPへの掲載や動画化などに利用させていただく可能性があります。
          </p>
        </div>

        {!retirementForm && (
          <section className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-sm leading-6 text-amber-800">
              退職届ページの入力内容が見つかりませんでした。先に退職届を作成してから進むと、次ページへの引き継ぎがスムーズです。
            </p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
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

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">
                  AI整形オプション（さらに200円引き）
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  共感されやすい形に整えつつ、個人や会社が特定されにくい表現へ調整します。
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  ※AI整形は1回のみ実行できます。内容を確認してから実行してください。
                </div>

                {!aiPolishExecuted && (
                  <button
                    type="button"
                    onClick={handleAiPolishPreview}
                    disabled={!canTryAiPolish || isPolishing}
                    className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPolishing
                      ? "AIが文章を整形しています…"
                      : "AI整形を実行する（さらに200円引き）"}
                  </button>
                )}

                {!aiPolishExecuted && aiPolishTryCount >= MAX_AI_POLISH_TRIES && (
                  <div className="mt-2 text-xs text-slate-500">
                    AI整形の上限回数に達しました。
                  </div>
                )}

                {aiPolishExecuted && (
                  <div className="mt-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      AI整形済み
                      {aiPolishAdopted
                        ? "（割引適用中・原文はそのまま保存されます）"
                        : "（まだ割引対象として選択していません）"}
                    </div>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleAdoptPolish}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          aiPolishAdopted
                            ? "bg-slate-900 text-white ring-2 ring-slate-300"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        この整形結果を使う
                      </button>

                      <button
                        type="button"
                        onClick={handleRevertPolish}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          !aiPolishAdopted
                            ? "bg-slate-900 text-white ring-2 ring-slate-300"
                            : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        この整形結果を使わない
                      </button>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      {aiPolishAdopted
                        ? "原文は変更せず、整形結果だけを別保存して割引対象にします。"
                        : "現在は原文のみ投稿されます。必要なら整形結果もあわせて保存します。"}
                    </div>
                  </div>
                )}
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
                    : "投稿して割引を適用する"}
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

              {polishError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="font-semibold text-red-700">{polishError}</div>
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
                  郵送補助 割引：-{EPISODE_POST_DISCOUNT}円
                  {!episodeDiscountApplied && "（未適用）"}
                </div>

                <div className={aiPolishDiscountApplied ? "text-slate-800" : "text-slate-400"}>
                  AI整形 割引：-{AI_POLISH_DISCOUNT}円
                  {aiPolishDiscountApplied ? "（適用中）" : "（未適用）"}
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

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">自動審査ルール</h2>
              <div className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                <p>・件名は4文字以上</p>
                <p>・本文は150文字以上</p>
                <p>・暴言、個人情報、URLは不可</p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">整形後プレビュー</h2>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                <div className="mb-2 font-semibold text-slate-900">件名</div>
                {subjectPreview || "整形後の件名がここに表示されます。"}
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                <div className="mb-2 font-semibold text-slate-900">本文</div>
                {normalizedPreview || "整形後の本文がここに表示されます。"}
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-line">
                <div className="mb-2 font-semibold text-slate-900">
                  ストレス発散方法（任意）
                </div>
                {normalizedStressPreview || "整形後のストレス発散方法がここに表示されます。"}
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-900 whitespace-pre-line">
                <div className="mb-2 font-semibold">匿名化チェック</div>
                {anonymousCheckNote || "匿名化や表現調整の結果がここに表示されます。"}
              </div>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <p className="text-sm leading-6 text-amber-800">
                このページでは割引を一時表示しています。投稿完了後に進む場合のみ、次ページへ情報を引き継ぎます。
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">引き継ぎ会社名</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {companyName || "未取得"}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">退職エピソード集</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                投稿されたエピソードをまとめた一覧ページです。運用開始後に公開予定です。
              </p>

              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
              >
                退職エピソード集を見る（coming soon）
              </button>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}