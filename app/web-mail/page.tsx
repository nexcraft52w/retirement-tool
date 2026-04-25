"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import LetterSheetPreview from "../components/LetterSheetPreview";

type SavedFormState = {
  name?: string;
  address?: string;
  companyName?: string;
  companyAddress?: string;
  department?: string;
  representativeName?: string;
};

type ResidentTaxType = "collect" | "self" | "none";
type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";
type DepositDocsMode = "none" | "has";
type PensionDocType = "none" | "pension_book" | "basic_notice";

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

type WebMailSavedState = {
  version: 2;
  form: WebMailForm;
  companyName: string;
  companyAddress: string;
  senderName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  updatedAt: string;
};

type RetirementDirectHandoff = {
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
  finalPrice?: number;
  discountAmount?: number;
  updatedAt?: string;
};

type EpisodeDiscountHandoff = {
  discount?: {
    basePrice?: number;
    episodeDiscountApplied?: boolean;
    aiPolishDiscountApplied?: boolean;
    totalDiscount?: number;
    finalPrice?: number;
  };
  episode?: {
    penName?: string;
    subject?: string;
    body?: string;
    stressRelief?: string;
    aiPolishExecuted?: boolean;
    aiPolishAdopted?: boolean;
    anonymousCheckNote?: string;
    aiPolishedBody?: string;
    companyName?: string;
  };
  retirementForm?: {
    name?: string;
    address?: string;
    department?: string;
    companyName?: string;
    companyAddress?: string;
    representativeName?: string;
    retirementDate?: string;
  };
  createdAt?: string;
};

type PreviewData = {
  companyName: string;
  senderName: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;

  itemName: string;

  basePrice: number;
  discountAmount: number;
  finalPrice: number;

  recipientName: string;
  department: string;
  returnItemsMode: ReturnItemsMode;
  returnItemsNote: string;
  belongingsMode: BelongingsMode;
  belongingsNote: string;
  requestedDocsBase: string[];
  requestedDocsExtra: string[];
  residentTaxText: string;
};

type NextPageAddressHandoff = {
  companyName: string;
  senderName: string;
  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;
  recipientName: string;
  department: string;
  itemName: string;
};

type LetterpackHandoff = {
  companyName: string;
  recipientName: string;
  companyAddress: string;

  senderName: string;
  senderZip: string;
  senderAddress: string;

  itemName: string;
};

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
  mailForm: WebMailForm;
  updatedAt: string;
};

type ResolvedPricing = {
  source: "episode" | "retirement" | "default";
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
};

const STORAGE_KEY = "retirement-document-form-v1";
const RETIREMENT_HANDOFF_KEY = "postal-discount-handoff-v1";
const EPISODE_DISCOUNT_HANDOFF_KEY = "episode-discount-handoff-v1";
const WEB_MAIL_FORM_STORAGE_KEY = "web-mail-form-v1";
const WEB_MAIL_NEXT_HANDOFF_KEY = "web-mail-next-handoff-v1";
const LETTERPACK_HANDOFF_KEY = "letterpack-handoff-v1";
const CHECKOUT_HANDOFF_KEY = "checkout-handoff-v1";

const WEB_MAIL_BASE_PRICE = 1500;

const FREE_CAMPAIGN = true;
const FREE_CAMPAIGN_LABEL = "2026/5/9まで無料";

const emptyForm: WebMailForm = {
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

const normalizeZip = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

const joinAddress = (a: string, b: string) => {
  return [a?.trim(), b?.trim()].filter(Boolean).join(" ");
};

const withSingleSama = (value: string) => {
  const t = (value ?? "").trim();
  if (!t) return "ご担当者様";
  return t.replace(/様+$/, "") + "様";
};

function buildRequestedDocsBlock(baseDocs: string[], extraDocs: string[]) {
  const lines: string[] = [];

  if (baseDocs.length > 0) {
    lines.push(baseDocs.join("・"));
  }

  if (extraDocs.length > 0) {
    lines.push(extraDocs.join("・"));
  }

  return lines.join("\n");
}

function buildLetterBodySections(preview: PreviewData) {
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

function resolvePricingFromHandoffs(
  episodeHandoff: EpisodeDiscountHandoff | null,
  retirementHandoff: RetirementDirectHandoff | null
): ResolvedPricing {
  if (episodeHandoff?.discount) {
    const basePrice =
      typeof episodeHandoff.discount.basePrice === "number"
        ? episodeHandoff.discount.basePrice
        : WEB_MAIL_BASE_PRICE;

    const finalPrice =
      typeof episodeHandoff.discount.finalPrice === "number"
        ? episodeHandoff.discount.finalPrice
        : basePrice;

    const discountAmount =
      typeof episodeHandoff.discount.totalDiscount === "number"
        ? episodeHandoff.discount.totalDiscount
        : Math.max(0, basePrice - finalPrice);

    return {
      source: "episode",
      basePrice,
      discountAmount,
      finalPrice,
    };
  }

  if (retirementHandoff) {
    const basePrice =
      typeof retirementHandoff.basePrice === "number"
        ? retirementHandoff.basePrice
        : WEB_MAIL_BASE_PRICE;

    const finalPrice =
      typeof retirementHandoff.finalPrice === "number"
        ? retirementHandoff.finalPrice
        : typeof retirementHandoff.discountedPriceMin === "number"
        ? retirementHandoff.discountedPriceMin
        : typeof retirementHandoff.discountedPriceMax === "number"
        ? retirementHandoff.discountedPriceMax
        : basePrice;

    const discountAmount =
      typeof retirementHandoff.discountAmount === "number"
        ? retirementHandoff.discountAmount
        : Math.max(0, basePrice - finalPrice);

    return {
      source: "retirement",
      basePrice,
      discountAmount,
      finalPrice,
    };
  }

  return {
    source: "default",
    basePrice: WEB_MAIL_BASE_PRICE,
    discountAmount: 0,
    finalPrice: WEB_MAIL_BASE_PRICE,
  };
}

export default function WebMailPage() {
  const [form, setForm] = useState<WebMailForm>(emptyForm);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [basePrice, setBasePrice] = useState(WEB_MAIL_BASE_PRICE);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(WEB_MAIL_BASE_PRICE);
  const [zipcodeError, setZipcodeError] = useState("");
  const [isRestored, setIsRestored] = useState(false);

  const sendCount = async (type: "view" | "postal") => {
    try {
      await fetch("/api/count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });
    } catch {
      //
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const retirementRaw = sessionStorage.getItem(RETIREMENT_HANDOFF_KEY);
      const episodeRaw = sessionStorage.getItem(EPISODE_DISCOUNT_HANDOFF_KEY);
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_FORM_STORAGE_KEY);

      const retirementHandoff = retirementRaw
        ? (JSON.parse(retirementRaw) as RetirementDirectHandoff)
        : null;

      const episodeHandoff = episodeRaw
        ? (JSON.parse(episodeRaw) as EpisodeDiscountHandoff)
        : null;

      let nextForm: WebMailForm = { ...emptyForm };
      let nextCompanyName = "";
      let nextCompanyAddress = "";
      let nextSenderName = "";

      if (raw) {
        const saved: SavedFormState = JSON.parse(raw);
        nextCompanyName = saved.companyName || "";
        nextCompanyAddress = saved.companyAddress || "";
        nextSenderName = saved.name || "";
        nextForm.senderAddress1 = saved.address || "";
        nextForm.department = saved.department || "";
      }

      if (retirementHandoff) {
        nextCompanyName = retirementHandoff.companyName || nextCompanyName;
        nextCompanyAddress =
          retirementHandoff.companyAddress || nextCompanyAddress;
        nextSenderName = retirementHandoff.senderName || nextSenderName;

        nextForm.department =
          retirementHandoff.senderDepartment || nextForm.department;

        if (!nextForm.senderAddress1) {
          nextForm.senderAddress1 = retirementHandoff.senderAddress || "";
        }

        if (!nextForm.recipientName) {
          nextForm.recipientName =
            retirementHandoff.representativeName || nextForm.recipientName;
        }
      }

      if (episodeHandoff) {
        nextCompanyName =
          episodeHandoff.retirementForm?.companyName ||
          episodeHandoff.episode?.companyName ||
          nextCompanyName;

        nextCompanyAddress =
          episodeHandoff.retirementForm?.companyAddress || nextCompanyAddress;

        nextSenderName = episodeHandoff.retirementForm?.name || nextSenderName;

        nextForm.department =
          episodeHandoff.retirementForm?.department || nextForm.department;

        if (!nextForm.senderAddress1) {
          nextForm.senderAddress1 =
            episodeHandoff.retirementForm?.address || "";
        }
      }

      const resolvedPricing = resolvePricingFromHandoffs(
        episodeHandoff,
        retirementHandoff
      );

      let nextBasePrice = resolvedPricing.basePrice;
      let nextDiscountAmount = resolvedPricing.discountAmount;
      let nextFinalPrice = resolvedPricing.finalPrice;

      if (webMailRaw) {
        const savedWebMail = JSON.parse(webMailRaw) as
          | Partial<WebMailSavedState>
          | Partial<WebMailForm>;

        if ("form" in savedWebMail && savedWebMail.form) {
          nextForm = {
            ...nextForm,
            ...savedWebMail.form,
          };
          nextCompanyName = savedWebMail.companyName ?? nextCompanyName;
          nextCompanyAddress = savedWebMail.companyAddress ?? nextCompanyAddress;
          nextSenderName = savedWebMail.senderName ?? nextSenderName;
          nextBasePrice = savedWebMail.basePrice ?? nextBasePrice;
          nextDiscountAmount = savedWebMail.discountAmount ?? nextDiscountAmount;
          nextFinalPrice = savedWebMail.finalPrice ?? nextFinalPrice;
        } else {
          // 旧形式互換：formだけを保存していた時代のデータ
          nextForm = {
            ...nextForm,
            ...(savedWebMail as Partial<WebMailForm>),
          };
        }
      }

      setForm({
        ...emptyForm,
        ...nextForm,
        itemName: nextForm.itemName ?? "書類",
        pensionDocType: nextForm.pensionDocType ?? "none",
      });

      setCompanyName(nextCompanyName);
      setCompanyAddress(nextCompanyAddress);
      setSenderName(nextSenderName);
      setBasePrice(nextBasePrice);
      setDiscountAmount(nextDiscountAmount);
      setFinalPrice(nextFinalPrice);
      setIsRestored(true);
    } catch {
      setForm(emptyForm);
      setCompanyName("");
      setCompanyAddress("");
      setSenderName("");
      setBasePrice(WEB_MAIL_BASE_PRICE);
      setDiscountAmount(0);
      setFinalPrice(WEB_MAIL_BASE_PRICE);
      setIsRestored(true);
    }
  }, []);

  useEffect(() => {
    sendCount("view");
  }, []);

  const displayFinalPrice = FREE_CAMPAIGN ? 0 : finalPrice;
  const displayDiscountAmount = FREE_CAMPAIGN
    ? basePrice
    : Math.max(0, discountAmount);

  const saveWebMailState = (targetForm: WebMailForm = form) => {
    /**
     * setForm直後の古いformを保存しないため、必ず引数のtargetFormを保存する。
     * checkoutはこの web-mail-form-v1 を原本として読む。
     */
    const normalizedForm: WebMailForm = {
      ...emptyForm,
      ...targetForm,
      itemName: targetForm.itemName || "書類",
      pensionDocType: targetForm.pensionDocType || "none",
    };

    const payload: WebMailSavedState = {
      version: 2,
      form: normalizedForm,
      companyName,
      companyAddress,
      senderName,
      basePrice,
      discountAmount,
      finalPrice: displayFinalPrice,
      updatedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(WEB_MAIL_FORM_STORAGE_KEY, JSON.stringify(payload));
  };

  useEffect(() => {
    if (!isRestored) return;
    saveWebMailState();
  }, [
    isRestored,
    form,
    companyName,
    companyAddress,
    senderName,
    basePrice,
    discountAmount,
    displayFinalPrice,
  ]);

  const fetchAddress = async (zip: string) => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length !== 7) return;

    try {
      setZipcodeError("");

      const res = await fetch(`/api/zipcode?zipcode=${digits}&zip=${digits}`);
      const data = await res.json();

      if (!res.ok) {
        setZipcodeError("住所検索に失敗しました。/api/zipcode を確認してください。");
        return;
      }

      let address = "";

      if (typeof data.address === "string") {
        address = data.address;
      }

      if (!address) {
        address = `${data.prefecture ?? ""}${data.city ?? ""}${data.town ?? ""}`;
      }

      if (!address && Array.isArray(data.results) && data.results[0]) {
        const r = data.results[0];
        address = `${r.address1 ?? ""}${r.address2 ?? ""}${r.address3 ?? ""}`;
      }

      if (!address.trim()) {
        setZipcodeError("郵便番号から住所を取得できませんでした。");
        return;
      }

      setForm((prev) => {
        const next: WebMailForm = {
          ...prev,
          senderAddress1: address,
        };
        saveWebMailState(next);
        return next;
      });
    } catch {
      setZipcodeError("住所検索で通信エラーが発生しました。");
    }
  };

  useEffect(() => {
    const digits = form.senderZip.replace(/\D/g, "");
    if (digits.length === 7) {
      fetchAddress(form.senderZip);
    }
  }, [form.senderZip]);

  const preview = useMemo<PreviewData>(() => {
    const residentTaxText =
      form.residentTaxType === "collect"
        ? "住民税は一括徴収でお願いいたします。"
        : form.residentTaxType === "self"
        ? "住民税は普通徴収に切り替えていただけますと幸いです。"
        : "";

    const requestedDocsBase = ["源泉徴収票", "最後の給与明細", "離職票"];
    const requestedDocsExtra: string[] = [];

    if (form.depositDocsMode === "has") {
      if (form.pensionDocType === "pension_book") {
        requestedDocsExtra.push("年金手帳");
      } else if (form.pensionDocType === "basic_notice") {
        requestedDocsExtra.push("基礎年金番号通知書");
      }

      if (form.depositEmploymentInsurance) {
        requestedDocsExtra.push("雇用保険被保険者証");
      }

      if (form.depositMyNumberCard) {
        requestedDocsExtra.push("マイナンバーカード");
      }
    }

    return {
      companyName: companyName || "未入力",
      senderName: senderName || "未入力",

      senderZip: form.senderZip || "",
      senderAddress1: form.senderAddress1 || "未入力",
      senderAddress2: form.senderAddress2 || "",

      itemName: (form.itemName ?? "").trim() || "書類",

      basePrice,
      discountAmount: displayDiscountAmount,
      finalPrice: displayFinalPrice,

      recipientName: withSingleSama(form.recipientName),
      department: form.department || "",
      returnItemsMode: form.returnItemsMode,
      returnItemsNote: form.returnItemsNote.trim(),
      belongingsMode: form.belongingsMode,
      belongingsNote: form.belongingsNote.trim(),
      requestedDocsBase,
      requestedDocsExtra,
      residentTaxText,
    };
  }, [
    form,
    companyName,
    senderName,
    basePrice,
    displayDiscountAmount,
    displayFinalPrice,
  ]);

  const bodySections = useMemo(() => {
    return buildLetterBodySections(preview);
  }, [preview]);

  const saveReturnToRetirementPageData = () => {
    try {
      const now = new Date().toISOString();
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const current = currentRaw ? JSON.parse(currentRaw) : {};

      const mergedRetirementForm = {
        ...current,
        name: preview.senderName === "未入力" ? current.name ?? "" : preview.senderName,
        address: joinAddress(preview.senderAddress1, preview.senderAddress2),
        companyName:
          preview.companyName === "未入力"
            ? current.companyName ?? ""
            : preview.companyName,
        companyAddress: companyAddress || current.companyAddress || "",
        department: preview.department || current.department || "",
        representativeName:
          form.recipientName.trim() || current.representativeName || "",
        updatedAt: now,
      };

      const returnPricingHandoff: RetirementDirectHandoff = {
        sourcePage: "web-mail",
        returnPath: "/",
        companyName:
          preview.companyName === "未入力"
            ? mergedRetirementForm.companyName
            : preview.companyName,
        senderName:
          preview.senderName === "未入力"
            ? mergedRetirementForm.name
            : preview.senderName,
        senderDepartment: preview.department,
        senderAddress: joinAddress(preview.senderAddress1, preview.senderAddress2),
        companyAddress: companyAddress || mergedRetirementForm.companyAddress || "",
        representativeName: form.recipientName.trim(),
        retirementDate: current.retirementDate || undefined,
        basePrice,
        discountAmount: displayDiscountAmount,
        finalPrice: displayFinalPrice,
        discountedPriceMin: displayFinalPrice,
        discountedPriceMax: displayFinalPrice,
        updatedAt: now,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedRetirementForm));
      sessionStorage.setItem(
        RETIREMENT_HANDOFF_KEY,
        JSON.stringify(returnPricingHandoff)
      );
      saveWebMailState();
      saveHandoffData();
    } catch {
      saveHandoffData();
    }
  };

  const saveHandoffData = () => {
    saveWebMailState();

    const nextPageHandoff: NextPageAddressHandoff = {
      companyName: preview.companyName,
      senderName: preview.senderName,
      senderZip: preview.senderZip,
      senderAddress1: preview.senderAddress1,
      senderAddress2: preview.senderAddress2,
      recipientName: preview.recipientName,
      department: preview.department,
      itemName: preview.itemName,
    };

    const letterpackHandoff: LetterpackHandoff = {
      companyName: preview.companyName,
      recipientName: preview.recipientName,
      companyAddress,

      senderName: preview.senderName,
      senderZip: preview.senderZip,
      senderAddress: joinAddress(preview.senderAddress1, preview.senderAddress2),

      itemName: preview.itemName,
    };

    const checkoutHandoff: CheckoutHandoff = {
      companyName: preview.companyName,
      companyAddress,
      senderName: preview.senderName,
      senderZip: preview.senderZip,
      senderAddress1: preview.senderAddress1,
      senderAddress2: preview.senderAddress2,
      senderAddress: joinAddress(preview.senderAddress1, preview.senderAddress2),
      recipientName: preview.recipientName,
      department: preview.department,
      itemName: preview.itemName,
      basePrice: preview.basePrice,
      discountAmount: preview.discountAmount,
      finalPrice: preview.finalPrice,
      mailForm: {
        ...emptyForm,
        ...form,
        itemName: preview.itemName,
      },
      updatedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      WEB_MAIL_NEXT_HANDOFF_KEY,
      JSON.stringify(nextPageHandoff)
    );
    sessionStorage.setItem(
      LETTERPACK_HANDOFF_KEY,
      JSON.stringify(letterpackHandoff)
    );
    sessionStorage.setItem(
      CHECKOUT_HANDOFF_KEY,
      JSON.stringify(checkoutHandoff)
    );
  };

  useEffect(() => {
    saveHandoffData();
  }, [preview, companyAddress]);

  const handleChange =
    (key: keyof WebMailForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement;
      let value: string | boolean =
        target.type === "checkbox" ? target.checked : target.value;

      if (key === "senderZip") {
        value = normalizeZip(String(value));
      }

      setForm((prev) => {
        const next: WebMailForm = {
          ...prev,
          [key]: value,
        };
        saveWebMailState(next);
        return next;
      });
    };

  const canGenerate =
    !!form.senderAddress1 && !!form.recipientName && !!preview.itemName;

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-[1450px]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
          <section className="rounded-3xl border bg-white p-6">
            <h1 className="mb-6 text-2xl font-bold">入力・確認</h1>

            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-sm text-slate-600">郵送補助料金</div>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="text-sm text-slate-500">
                  <div>通常価格：{basePrice}円</div>
                  {FREE_CAMPAIGN ? (
                    <div>無料期間適用：- {basePrice}円</div>
                  ) : (
                    <div>現在の割引：- {discountAmount}円</div>
                  )}
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {displayFinalPrice}円
                </div>
              </div>
            </div>

            {zipcodeError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {zipcodeError}
              </div>
            )}

            <div className="space-y-4">
              <Field
                label="所属部署名"
                value={form.department}
                onChange={handleChange("department")}
              />

              <Field
                label="宛名"
                value={form.recipientName}
                onChange={handleChange("recipientName")}
                placeholder="ご担当者"
              />

              <hr />

              <Field
                label="差出人住所（郵便番号）"
                value={form.senderZip}
                onChange={handleChange("senderZip")}
                placeholder="123-4567"
              />

              <Field
                label="差出人住所1"
                value={form.senderAddress1}
                onChange={handleChange("senderAddress1")}
              />

              <Field
                label="差出人住所2"
                value={form.senderAddress2}
                onChange={handleChange("senderAddress2")}
              />

              <hr />

              <Field
                label="品名"
                value={form.itemName}
                onChange={handleChange("itemName")}
                placeholder="書類"
              />

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">返却頂くもの</div>
                <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-7">
                  <div>・源泉徴収票</div>
                  <div>・最後の給与明細</div>
                  <div>・離職票</div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="depositDocsMode"
                      value="none"
                      checked={form.depositDocsMode === "none"}
                      onChange={handleChange("depositDocsMode")}
                    />
                    預けていない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="depositDocsMode"
                      value="has"
                      checked={form.depositDocsMode === "has"}
                      onChange={handleChange("depositDocsMode")}
                    />
                    預けてしまっている
                  </label>
                </div>

                {form.depositDocsMode === "has" && (
                  <div className="mt-3 space-y-4 rounded-xl border bg-slate-50 p-4">
                    <div className="space-y-2">
                      <div className="text-base font-bold">年金関連書類</div>

                      <label className="flex items-center gap-2 text-base">
                        <input
                          type="radio"
                          name="pensionDocType"
                          value="pension_book"
                          checked={form.pensionDocType === "pension_book"}
                          onChange={handleChange("pensionDocType")}
                        />
                        年金手帳
                      </label>

                      <label className="flex items-center gap-2 text-base">
                        <input
                          type="radio"
                          name="pensionDocType"
                          value="basic_notice"
                          checked={form.pensionDocType === "basic_notice"}
                          onChange={handleChange("pensionDocType")}
                        />
                        基礎年金番号通知書
                      </label>

                      <label className="flex items-center gap-2 text-base">
                        <input
                          type="radio"
                          name="pensionDocType"
                          value="none"
                          checked={form.pensionDocType === "none"}
                          onChange={handleChange("pensionDocType")}
                        />
                        どちらもない
                      </label>
                    </div>

                    <div className="space-y-2 border-t pt-3">
                      <label className="flex items-center gap-2 text-base">
                        <input
                          type="checkbox"
                          checked={form.depositEmploymentInsurance}
                          onChange={handleChange("depositEmploymentInsurance")}
                        />
                        雇用保険被保険者証
                      </label>

                      <label className="flex items-center gap-2 text-base">
                        <input
                          type="checkbox"
                          checked={form.depositMyNumberCard}
                          onChange={handleChange("depositMyNumberCard")}
                        />
                        マイナンバーカード
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">私物返送</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="belongingsMode"
                      value="none"
                      checked={form.belongingsMode === "none"}
                      onChange={handleChange("belongingsMode")}
                    />
                    追記しない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="belongingsMode"
                      value="request"
                      checked={form.belongingsMode === "request"}
                      onChange={handleChange("belongingsMode")}
                    />
                    私物返送をお願いする
                  </label>
                </div>
              </div>

              {form.belongingsMode === "request" && (
                <TextAreaField
                  label="私物入力欄"
                  value={form.belongingsNote}
                  onChange={handleChange("belongingsNote")}
                  placeholder="例：デスク引き出し内の私物、ロッカー内の衣類、手帳 など"
                />
              )}

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">返却物</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="returnItemsMode"
                      value="none"
                      checked={form.returnItemsMode === "none"}
                      onChange={handleChange("returnItemsMode")}
                    />
                    追記しない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="returnItemsMode"
                      value="return"
                      checked={form.returnItemsMode === "return"}
                      onChange={handleChange("returnItemsMode")}
                    />
                    返却物を記載する
                  </label>
                </div>
              </div>

              {form.returnItemsMode === "return" && (
                <TextAreaField
                  label="返却物入力欄"
                  value={form.returnItemsNote}
                  onChange={handleChange("returnItemsNote")}
                  placeholder="例：制服・名札・携帯・名刺"
                />
              )}

              <div className="space-y-3 rounded-xl border bg-amber-50 p-4 text-sm leading-7 text-slate-700">
                <p>郵送物に入りきらない場合は、お手数ですが別送をご検討ください。</p>
                <p className="font-bold text-slate-900">
                  会社側も回収物が残ってしまった場合は、貴方へ連絡を取らざるを得なくなります。
                </p>
                <p className="font-bold text-slate-900">
                  やり取りを減らすためにも、返却はしておきましょう。
                </p>
              </div>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">住民税</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="collect"
                      checked={form.residentTaxType === "collect"}
                      onChange={handleChange("residentTaxType")}
                    />
                    一括徴収
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="self"
                      checked={form.residentTaxType === "self"}
                      onChange={handleChange("residentTaxType")}
                    />
                    自分で支払います
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="none"
                      checked={form.residentTaxType === "none"}
                      onChange={handleChange("residentTaxType")}
                    />
                    記載しない
                  </label>
                </div>

              <button
                type="button"
                onClick={() => {
                window.open("/next-step", "_blank", "noopener,noreferrer");
                }}
                className="mt-3 w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                ご不明な方は、リンク先の4.住民税をご参照ください。
              </button>


              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-0">
              <div className="px-6 pt-6">
                <div className="mb-6 rounded-2xl border-2 border-red-400 bg-red-50 p-6 text-center text-xl font-bold text-red-700 leading-8">
                  この画面で最終確認してから決済してください。（訂正できません）<br />
                  決済後はすぐにPDFをダウンロードしてください（再発行できません）。
                </div>
              </div>

              <LetterSheetPreview
                preview={preview}
                bodySections={bodySections}
                showSample={true}
              />
            </section>

            <div className="grid gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                この郵送補助では、退職時に発生するやり取りを事前に整理したうえで作成できます。
                <br />
                やり取りを減らしたい方は、このまま進んでください。
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-xl font-bold text-slate-900">次の決済画面</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  現在は無料期間中です。このまま次へ進めます。
                </p>

                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm text-slate-600">現在の料金</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-700">
                    {displayFinalPrice}円
                  </div>
                  <div className="mt-2 text-sm text-emerald-700">
                    {FREE_CAMPAIGN_LABEL}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => {
                  sendCount("postal");
                  saveHandoffData();

                  sessionStorage.setItem("web-mail-paid", "true");
                  window.location.href = "/success?paid=1";
                  }}
                  className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-white disabled:bg-gray-300"
                  >
                  次の決済画面へ進む（今は無料）
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  saveReturnToRetirementPageData();
                  window.location.href = "/";
                }}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-700"
              >
                退職届作成ページへ戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-lg font-bold">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border p-3"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-lg font-bold">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border p-3"
      />
    </div>
  );
}