"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LetterSheetPreview from "../components/LetterSheetPreview";

type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";
type ResidentTaxType = "collect" | "self" | "none";
type DepositDocsMode = "none" | "has";
type PensionDocType = "none" | "pension_book" | "basic_notice";

type CheckoutHandoff = {
  companyName: string;
  companyAddress: string;
  senderName: string;
  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;
  senderAddress: string;
  recipientName: string;
  department: string;
  itemName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  updatedAt?: string;
};

type WebMailForm = {
  department: string;
  recipientName: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;

  itemName: string;

  returnItemsMode: ReturnItemsMode;
  returnItemsNote: string;

  depositDocsMode: DepositDocsMode;
  pensionDocType: PensionDocType;
  depositEmploymentInsurance: boolean;
  depositMyNumberCard: boolean;

  belongingsMode: BelongingsMode;
  belongingsNote: string;

  residentTaxType: ResidentTaxType;
};

const emptyWebMailForm: WebMailForm = {
  department: "",
  recipientName: "",

  senderZip: "",
  senderAddress1: "",
  senderAddress2: "",

  itemName: "書類",

  returnItemsMode: "none",
  returnItemsNote: "",

  depositDocsMode: "none",
  pensionDocType: "none",
  depositEmploymentInsurance: false,
  depositMyNumberCard: false,

  belongingsMode: "none",
  belongingsNote: "",

  residentTaxType: "none",
};

const CHECKOUT_KEY = "checkout-handoff-v1";
const RETIREMENT_STORAGE_KEY = "retirement-document-form-v1";
const WEB_MAIL_KEY = "web-mail-form-v1";
const RETIREMENT_HANDOFF_KEY = "postal-discount-handoff-v1";
const WEB_MAIL_NEXT_HANDOFF_KEY = "web-mail-next-handoff-v1";
const LETTERPACK_HANDOFF_KEY = "letterpack-handoff-v1";

const BASE_PRICE = 1500;

const joinAddress = (a?: string, b?: string) => {
  return [a ?? "", b ?? ""].map((v) => v.trim()).filter(Boolean).join(" ");
};

const withSingleSama = (value: string) => {
  const t = (value ?? "").trim();
  if (!t) return "ご担当者様";
  return t.replace(/様+$/, "") + "様";
};

const numberOrDefault = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function buildRequestedDocsBlock(baseDocs: string[], extraDocs: string[]) {
  const lines: string[] = [];

  if (baseDocs.length > 0) lines.push(baseDocs.join("・"));
  if (extraDocs.length > 0) lines.push(extraDocs.join("・"));

  return lines.join("\n");
}

function buildLetterBodySections(preview: {
  belongingsMode: BelongingsMode;
  belongingsNote: string;
  returnItemsMode: ReturnItemsMode;
  returnItemsNote: string;
  residentTaxText: string;
  requestedDocsBase: string[];
  requestedDocsExtra: string[];
}) {
  const sections: string[] = [];

  sections.push("拝啓");

  sections.push("お世話になっております。\n退職に伴う書類を送付いたします。");

  if (preview.belongingsMode === "request") {
    sections.push(
      `お手数をおかけしますが、私物は着払いにて送付をお願いいたします。${
        preview.belongingsNote ? `\n私物内容：${preview.belongingsNote}` : ""
      }`
    );
  }

  if (preview.returnItemsMode === "return") {
    sections.push(
      `貸与頂いていましたものをお返しいたします。${
        preview.returnItemsNote ? `\n返却物：${preview.returnItemsNote}` : ""
      }`
    );
  }

  if (preview.residentTaxText) {
    sections.push(preview.residentTaxText);
  }

  sections.push(
    `${buildRequestedDocsBlock(
      preview.requestedDocsBase,
      preview.requestedDocsExtra
    )}\nにつきましては、こちらの書類の送り元住所へお送りください。`
  );

  sections.push("ご確認のほど、よろしくお願いいたします。");

  return sections;
}

function normalizeCheckoutHandoff(raw: Partial<CheckoutHandoff>): CheckoutHandoff {
  const senderAddress =
    raw.senderAddress || joinAddress(raw.senderAddress1, raw.senderAddress2);

  return {
    companyName: raw.companyName || "",
    companyAddress: raw.companyAddress || "",
    senderName: raw.senderName || "",
    senderZip: raw.senderZip || "",
    senderAddress1: raw.senderAddress1 || senderAddress || "",
    senderAddress2: raw.senderAddress2 || "",
    senderAddress,
    recipientName: raw.recipientName || "",
    department: raw.department || "",
    itemName: raw.itemName || "書類",
    basePrice: numberOrDefault(raw.basePrice, BASE_PRICE),
    discountAmount: numberOrDefault(raw.discountAmount, 0),
    finalPrice: numberOrDefault(raw.finalPrice, BASE_PRICE),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeWebMailForm(
  handoff: CheckoutHandoff,
  current: Partial<WebMailForm>
): WebMailForm {
  return {
    ...emptyWebMailForm,
    ...current,
    department: current.department ?? handoff.department ?? "",
    recipientName: current.recipientName ?? handoff.recipientName ?? "",
    senderZip: current.senderZip ?? handoff.senderZip ?? "",
    senderAddress1:
      current.senderAddress1 ?? handoff.senderAddress1 ?? handoff.senderAddress ?? "",
    senderAddress2: current.senderAddress2 ?? handoff.senderAddress2 ?? "",
    itemName: current.itemName ?? handoff.itemName ?? "書類",
  };
}

function readJson<T>(key: string, storage: Storage): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function preserveCheckoutState(args: {
  handoff: CheckoutHandoff;
  webMailForm: WebMailForm;
  webMailRawRef: React.MutableRefObject<string | null>;
}) {
  const { handoff, webMailForm, webMailRawRef } = args;
  const now = new Date().toISOString();
  const normalizedHandoff = normalizeCheckoutHandoff({
    ...handoff,
    updatedAt: now,
  });

  // checkout自身の受け渡し情報
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(normalizedHandoff));

  // 重要：web-mail-form-v1はcheckoutで薄いデータに作り直さない。
  // web-mailが保存した原本がある場合は、それをそのまま戻す。
  if (webMailRawRef.current) {
    sessionStorage.setItem(WEB_MAIL_KEY, webMailRawRef.current);
  } else {
    const fallbackForm = normalizeWebMailForm(normalizedHandoff, webMailForm);
    sessionStorage.setItem(WEB_MAIL_KEY, JSON.stringify(fallbackForm));
    webMailRawRef.current = JSON.stringify(fallbackForm);
  }

  // 退職届ページへ戻る時に金額も戻す。
  const currentRetirement = readJson<any>(RETIREMENT_STORAGE_KEY, localStorage) ?? {};

  localStorage.setItem(
    RETIREMENT_STORAGE_KEY,
    JSON.stringify({
      ...currentRetirement,
      name: currentRetirement.name || normalizedHandoff.senderName || "",
      address: currentRetirement.address || normalizedHandoff.senderAddress || "",
      department: currentRetirement.department || normalizedHandoff.department || "",
      companyName: currentRetirement.companyName || normalizedHandoff.companyName || "",
      companyAddress:
        currentRetirement.companyAddress || normalizedHandoff.companyAddress || "",
      representativeName:
        currentRetirement.representativeName ||
        normalizedHandoff.recipientName ||
        "",
      updatedAt: currentRetirement.updatedAt || now,
    })
  );

  sessionStorage.setItem(
    RETIREMENT_HANDOFF_KEY,
    JSON.stringify({
      returnPath: "/",
      companyName: normalizedHandoff.companyName,
      senderName: normalizedHandoff.senderName,
      senderDepartment: normalizedHandoff.department,
      senderAddress: normalizedHandoff.senderAddress,
      companyAddress: normalizedHandoff.companyAddress,
      representativeName: normalizedHandoff.recipientName,
      basePrice: normalizedHandoff.basePrice,
      discountAmount: normalizedHandoff.discountAmount,
      finalPrice: normalizedHandoff.finalPrice,
      discountedPriceMin: normalizedHandoff.finalPrice,
      discountedPriceMax: normalizedHandoff.finalPrice,
      updatedAt: now,
    })
  );

  sessionStorage.setItem(
    WEB_MAIL_NEXT_HANDOFF_KEY,
    JSON.stringify({
      companyName: normalizedHandoff.companyName,
      senderName: normalizedHandoff.senderName,
      senderZip: normalizedHandoff.senderZip,
      senderAddress1: normalizedHandoff.senderAddress1,
      senderAddress2: normalizedHandoff.senderAddress2,
      recipientName: normalizedHandoff.recipientName,
      department: normalizedHandoff.department,
      itemName: normalizedHandoff.itemName,
    })
  );

  sessionStorage.setItem(
    LETTERPACK_HANDOFF_KEY,
    JSON.stringify({
      companyName: normalizedHandoff.companyName,
      recipientName: normalizedHandoff.recipientName,
      companyAddress: normalizedHandoff.companyAddress,
      senderName: normalizedHandoff.senderName,
      senderZip: normalizedHandoff.senderZip,
      senderAddress: normalizedHandoff.senderAddress,
      itemName: normalizedHandoff.itemName,
    })
  );
}

export default function CheckoutClient() {
  const router = useRouter();

  const webMailRawRef = useRef<string | null>(null);

  const [handoff, setHandoff] = useState<CheckoutHandoff | null>(null);
  const [webMailForm, setWebMailForm] = useState<WebMailForm>(emptyWebMailForm);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const checkoutRaw = sessionStorage.getItem(CHECKOUT_KEY);
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_KEY);
      webMailRawRef.current = webMailRaw;

      if (!checkoutRaw) {
        setHandoff(null);
        setError("前ページの情報が見つかりません。郵送補助ページからやり直してください。");
        return;
      }

      const parsedHandoff = normalizeCheckoutHandoff(
        JSON.parse(checkoutRaw) as Partial<CheckoutHandoff>
      );

      const parsedWebMail = webMailRaw
        ? (JSON.parse(webMailRaw) as Partial<WebMailForm>)
        : {};

      const normalizedForm = normalizeWebMailForm(parsedHandoff, parsedWebMail);

      setHandoff(parsedHandoff);
      setWebMailForm(normalizedForm);

      preserveCheckoutState({
        handoff: parsedHandoff,
        webMailForm: normalizedForm,
        webMailRawRef,
      });
    } catch {
      setHandoff(null);
      setError("確認情報の読み込みに失敗しました。郵送補助ページからやり直してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saveOnLeave = () => {
      if (!handoff) return;
      preserveCheckoutState({ handoff, webMailForm, webMailRawRef });
    };

    window.addEventListener("pagehide", saveOnLeave);
    window.addEventListener("beforeunload", saveOnLeave);

    return () => {
      window.removeEventListener("pagehide", saveOnLeave);
      window.removeEventListener("beforeunload", saveOnLeave);
    };
  }, [handoff, webMailForm]);

  const price = handoff?.finalPrice ?? 0;

  const preview = useMemo(() => {
    if (!handoff) return null;

    const requestedDocsBase = ["源泉徴収票", "最後の給与明細", "離職票"];
    const requestedDocsExtra: string[] = [];

    if (webMailForm.depositDocsMode === "has") {
      if (webMailForm.pensionDocType === "pension_book") {
        requestedDocsExtra.push("年金手帳");
      } else if (webMailForm.pensionDocType === "basic_notice") {
        requestedDocsExtra.push("基礎年金番号通知書");
      }

      if (webMailForm.depositEmploymentInsurance) {
        requestedDocsExtra.push("雇用保険被保険者証");
      }

      if (webMailForm.depositMyNumberCard) {
        requestedDocsExtra.push("マイナンバーカード");
      }
    }

    const residentTaxText =
      webMailForm.residentTaxType === "collect"
        ? "住民税は一括徴収でお願いいたします。"
        : webMailForm.residentTaxType === "self"
        ? "住民税は普通徴収に切り替えていただけますと幸いです。"
        : "";

    return {
      companyName: handoff.companyName || "未入力",
      senderName: handoff.senderName || "未入力",

      senderZip: handoff.senderZip || "",
      senderAddress1: handoff.senderAddress1 || handoff.senderAddress || "未入力",
      senderAddress2: handoff.senderAddress2 || "",

      itemName: handoff.itemName || "書類",

      recipientName: withSingleSama(handoff.recipientName),
      department: handoff.department || "",

      returnItemsMode: webMailForm.returnItemsMode || "none",
      returnItemsNote: webMailForm.returnItemsNote || "",
      belongingsMode: webMailForm.belongingsMode || "none",
      belongingsNote: webMailForm.belongingsNote || "",
      requestedDocsBase,
      requestedDocsExtra,
      residentTaxText,
    };
  }, [handoff, webMailForm]);

  const bodySections = useMemo(() => {
    if (!preview) return [];
    return buildLetterBodySections(preview);
  }, [preview]);

  const handleCheckout = async () => {
    if (!handoff || processing) return;

    preserveCheckoutState({ handoff, webMailForm, webMailRawRef });
    setProcessing(true);
    setError("");

    try {
      if (price <= 0) {
        router.push("/letterpack");
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          handoff,
          price,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.url) {
        setError(data?.error || "決済ページの作成に失敗しました。");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("決済処理で通信エラーが発生しました。");
    } finally {
      setProcessing(false);
    }
  };

  const handleBackToWebMail = () => {
    if (handoff) {
      preserveCheckoutState({ handoff, webMailForm, webMailRawRef });
    }

    router.push("/web-mail");
  };

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-10">読み込み中...</main>;
  }

  if (!handoff || !preview) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-bold">確認情報がありません</h1>
          <p className="mt-3 text-sm text-slate-600">
            {error || "郵送補助ページからやり直してください。"}
          </p>
          <button
            type="button"
            onClick={() => router.push("/web-mail")}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-white"
          >
            郵送補助ページへ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-[1450px] space-y-6">
        <section className="rounded-3xl border bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">最終確認</h1>

          <p className="mt-3 text-base font-semibold text-slate-800">
            この内容で出力依頼を進めて大丈夫ですか？
          </p>

          <p className="mt-1 text-sm leading-7 text-red-700">
            ※ここから先は内容の変更はできません。修正する場合は、戻って郵送補助ページで変更してください。
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-3xl border bg-white p-0">
            <div className="px-6 pt-6">
              <h2 className="mb-4 text-center text-2xl font-bold">
                送り状プレビュー
              </h2>
            </div>

            <LetterSheetPreview
              preview={preview}
              bodySections={bodySections}
              showSample={true}
            />
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">料金確認</h2>

              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="text-sm text-slate-600">現在の料金</div>

                <div className="mt-1 text-4xl font-bold text-emerald-700">
                  {price.toLocaleString()}円
                </div>

                <div className="mt-3 text-sm leading-6 text-slate-700">
                  現在は無料でご利用いただけます。
                  <br />
                  有料化後は 1,500円 → 1,200円 → 1,000円
                  （割引適用時）となります。
                </div>

                {handoff.basePrice > price && (
                  <div className="mt-3 text-sm leading-6 text-emerald-700">
                    通常価格：{handoff.basePrice.toLocaleString()}円
                    <br />
                    割引：-{handoff.discountAmount.toLocaleString()}円
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={processing}
                className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:bg-gray-300"
              >
                {processing
                  ? "処理中..."
                  : price <= 0
                  ? "無料で出力依頼を進める"
                  : `${price.toLocaleString()}円で決済へ進む`}
              </button>

              <button
                type="button"
                onClick={handleBackToWebMail}
                disabled={processing}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 disabled:bg-gray-100 disabled:text-gray-400"
              >
                戻って修正する
              </button>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
              この画面は最終確認用です。内容を修正する場合は、前のページへ戻ってください。
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
