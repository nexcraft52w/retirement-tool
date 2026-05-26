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

  healthConditionNote: boolean;
};

type WebMailSavedState = {
  version: 2;
  sessionId: string;
  form: WebMailForm;
  companyName: string;
  companyAddress: string;
  senderName: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  coverLetterSections?: string[];
  coverLetterBody?: string;
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
    totalDiscount?: number;
    finalPrice?: number;
  };
  episode?: {
    penName?: string;
    subject?: string;
    body?: string;
    stressRelief?: string;
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
  healthConditionNote: boolean;
};

type NextPageAddressHandoff = {
  sessionId: string;
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
  sessionId: string;
  companyName: string;
  recipientName: string;
  companyAddress: string;

  senderName: string;
  senderZip: string;
  senderAddress: string;

  itemName: string;
};

type CheckoutHandoff = {
  sessionId: string;
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
  coverLetterSections: string[];
  coverLetterBody: string;
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
const SESSION_ID_KEY = "retirement-session-id-v1";

const WEB_MAIL_CONFIG = {
  basePrice: 1500,
  freeCampaign: true,
  freeCampaignLabel: "今だけ無料公開中",
  paths: {
    countApi: "/api/count",
    zipcodeApi: "/api/zipcode",
    checkout: "/checkout",
    nextStepResidentTax: "/next-step#resident-tax",
    residentTaxGuide: "https://guide.taishoku-tool.com/taishoku-juuminzei",
    retirementTop: "/",
  },
  images: {
    hero: "/images/taishoku-baasama/taishoku-baasama-half-guide.png",
    gassho: "/images/taishoku-baasama/taishoku-baasama-half-gassho.png",
    guide: "/images/taishoku-baasama/taishoku-baasama-half-guide.png",
    point: "/images/taishoku-baasama/taishoku-baasama-half-point.png",
    think: "/images/taishoku-baasama/taishoku-baasama-half-think.png",
    thumbsUp: "/images/taishoku-baasama/taishoku-baasama-half-thumbsup.png",
    headerBanner: "/images/taishoku-baasama/taishoku-tool-header-banner.png",
  },
} as const;

const EPISODE_POST_DISCOUNT = 500;

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
  healthConditionNote: true,
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

const getSessionId = () => {
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;

    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(SESSION_ID_KEY, next);
    return next;
  } catch {
    return "";
  }
};
type CountEventType =
  | "page_view"
  | "click"
  | "pdf_download"
  | "postal_start"
  | "checkout_start"
  | "checkout_success";

type CountPayload = {
  eventType: CountEventType;
  pagePath: string;
  action?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

async function postCount(payload: CountPayload) {
  try {
    await fetch(WEB_MAIL_CONFIG.paths.countApi, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // 計測失敗はユーザー操作を止めない
  }
}

async function lookupZipcode(zip: string) {
  const digits = zip.replace(/\D/g, "");
  if (digits.length !== 7) return { address: "", error: "" };

  try {
    const res = await fetch(
      `${WEB_MAIL_CONFIG.paths.zipcodeApi}?zipcode=${digits}&zip=${digits}`
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        address: "",
        error: "住所検索に失敗しました。郵便番号APIを確認してください。",
      };
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
      return {
        address: "",
        error: "郵便番号から住所を取得できませんでした。",
      };
    }

    return { address, error: "" };
  } catch {
    return {
      address: "",
      error: "住所検索で通信エラーが発生しました。",
    };
  }
}

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

  sections.push(
    `お世話になっております。\n退職に伴う書類を送付いたします。${
      preview.healthConditionNote
        ? "\nなお、体調不良により勤務継続、電話応対が困難な状況です。\n以後のご連絡は書面または郵送にてお願いいたします。"
        : ""
    }`
  );

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
        : WEB_MAIL_CONFIG.basePrice;

    const finalPrice =
      typeof episodeHandoff.discount.finalPrice === "number"
        ? episodeHandoff.discount.finalPrice
        : episodeHandoff.discount.episodeDiscountApplied
        ? Math.max(0, basePrice - EPISODE_POST_DISCOUNT)
        : basePrice;

    const discountAmount =
      typeof episodeHandoff.discount.totalDiscount === "number"
        ? episodeHandoff.discount.totalDiscount
        : episodeHandoff.discount.episodeDiscountApplied
        ? EPISODE_POST_DISCOUNT
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
        : WEB_MAIL_CONFIG.basePrice;

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
    basePrice: WEB_MAIL_CONFIG.basePrice,
    discountAmount: 0,
    finalPrice: WEB_MAIL_CONFIG.basePrice,
  };
}

export default function WebMailPage() {
  const [form, setForm] = useState<WebMailForm>(emptyForm);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [basePrice, setBasePrice] = useState<number>(WEB_MAIL_CONFIG.basePrice);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(WEB_MAIL_CONFIG.basePrice);
  const [zipcodeError, setZipcodeError] = useState("");
  const [isRestored, setIsRestored] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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
        nextForm.department = "";
      }

      if (retirementHandoff) {
        nextCompanyName = retirementHandoff.companyName || nextCompanyName;
        nextCompanyAddress =
          retirementHandoff.companyAddress || nextCompanyAddress;
        nextSenderName = retirementHandoff.senderName || nextSenderName;

        if (!nextForm.senderAddress1) {
          nextForm.senderAddress1 = retirementHandoff.senderAddress || "";
        }
      }

      // episodeHandoff は割引情報のみ使用する。
      // 会社名・差出人情報は退職届由来の retirementHandoff / 保存済み web-mail から復元する。

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
        healthConditionNote: nextForm.healthConditionNote ?? true,
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
      setBasePrice(WEB_MAIL_CONFIG.basePrice);
      setDiscountAmount(0);
      setFinalPrice(WEB_MAIL_CONFIG.basePrice);
      setIsRestored(true);
    }
  }, []);

  useEffect(() => {
    postCount({
      eventType: "page_view",
      pagePath: "/web-mail",
      sessionId: getSessionId(),
    });
  }, []);

  const displayFinalPrice = WEB_MAIL_CONFIG.freeCampaign ? 0 : finalPrice;
  const displayDiscountAmount = WEB_MAIL_CONFIG.freeCampaign
    ? basePrice
    : Math.max(0, discountAmount);

  const saveWebMailState = (targetForm: WebMailForm = form) => {
    const normalizedForm: WebMailForm = {
      ...emptyForm,
      ...targetForm,
      itemName: targetForm.itemName || "書類",
      pensionDocType: targetForm.pensionDocType || "none",
      healthConditionNote: targetForm.healthConditionNote ?? true,
    };

    const payload: WebMailSavedState = {
      version: 2,
      sessionId: getSessionId(),
      form: normalizedForm,
      companyName,
      companyAddress,
      senderName,
      basePrice,
      discountAmount,
      finalPrice: displayFinalPrice,
      coverLetterSections: bodySections,
      coverLetterBody: bodySections.join("\n\n"),
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
    const result = await lookupZipcode(zip);

    if (result.error) {
      setZipcodeError(result.error);
      return;
    }

    if (!result.address) return;

    setZipcodeError("");

    setForm((prev) => {
      const next: WebMailForm = {
        ...prev,
        senderAddress1: result.address,
      };
      saveWebMailState(next);
      return next;
    });
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
      healthConditionNote: form.healthConditionNote,
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
        name:
          preview.senderName === "未入力" ? current.name ?? "" : preview.senderName,
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
        returnPath: WEB_MAIL_CONFIG.paths.retirementTop,
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
    try {
      const sessionId = getSessionId();

      if (!sessionId) {
        throw new Error("sessionId could not be created.");
      }

      saveWebMailState();

      const normalizedMailForm: WebMailForm = {
        ...emptyForm,
        ...form,
        itemName: preview.itemName,
        healthConditionNote: form.healthConditionNote ?? true,
      };

      const senderAddress = joinAddress(
        preview.senderAddress1,
        preview.senderAddress2
      );

      const nextPageHandoff: NextPageAddressHandoff = {
        sessionId,
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
        sessionId,
        companyName: preview.companyName,
        recipientName: preview.recipientName,
        companyAddress,

        senderName: preview.senderName,
        senderZip: preview.senderZip,
        senderAddress,

        itemName: preview.itemName,
      };

      const checkoutHandoff: CheckoutHandoff = {
        sessionId,
        companyName: preview.companyName,
        companyAddress,
        senderName: preview.senderName,
        senderZip: preview.senderZip,
        senderAddress1: preview.senderAddress1,
        senderAddress2: preview.senderAddress2,
        senderAddress,
        recipientName: preview.recipientName,
        department: preview.department,
        itemName: preview.itemName,
        basePrice: preview.basePrice,
        discountAmount: preview.discountAmount,
        finalPrice: preview.finalPrice,
        mailForm: normalizedMailForm,
        coverLetterSections: bodySections,
        coverLetterBody: bodySections.join("\n\n"),
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

      const savedRaw = sessionStorage.getItem(CHECKOUT_HANDOFF_KEY);
      if (!savedRaw) {
        throw new Error("checkout handoff was not saved.");
      }

      const saved = JSON.parse(savedRaw) as Partial<CheckoutHandoff>;
      if (
        saved.sessionId !== sessionId ||
        !Array.isArray(saved.coverLetterSections) ||
        saved.coverLetterSections.length === 0 ||
        typeof saved.coverLetterBody !== "string" ||
        saved.coverLetterBody.trim().length === 0
      ) {
        throw new Error("checkout handoff validation failed.");
      }

      return true;
    } catch (error) {
      console.error("[web-mail handoff save error]", error);
      return false;
    }
  };

  useEffect(() => {
    if (!isRestored) return;
    saveHandoffData();
  }, [isRestored, preview, companyAddress]);

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

  const canGenerate = !!form.senderAddress1 && !!preview.itemName;

  return (
    <main className="min-h-screen bg-[#f5f8fb] p-4 text-slate-900">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-6 overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-sm">
          <img
            src={WEB_MAIL_CONFIG.images.headerBanner}
            alt="退職ツール 郵送補助"
            className="block h-auto w-full"
          />
        </div>

        <section className="mb-6 overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex rounded-full bg-[#082f5f] px-3 py-1 text-xs font-bold text-white">
                退職ツール 郵送補助
              </div>
              <h1 className="text-2xl font-black leading-tight text-[#082f5f] sm:text-3xl">
                退職時のやり取りを、先に整理して郵送文面にまとめます。
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
                退職ばあ様が、返却物・私物・住民税・会社から返してもらう書類を確認しながら案内します。
              </p>
            </div>

            <img
              src={WEB_MAIL_CONFIG.images.hero}
              alt="退職ばあ様"
              className="mt-2 h-36 w-auto self-center object-contain sm:mt-0 sm:h-52 sm:self-end lg:h-60"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-2xl font-black text-[#082f5f]">入力・確認</h2>

            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="text-sm text-slate-600">郵送補助料金</div>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div className="text-sm text-slate-500">
                  <div>通常価格：{basePrice}円</div>
                  {WEB_MAIL_CONFIG.freeCampaign ? (
                    <div>無料期間適用：- {basePrice}円</div>
                  ) : (
                    <div>現在の割引：- {discountAmount}円</div>
                  )}
                </div>
                <div className="text-2xl font-black text-[#0f766e]">
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
                label="所属部署名（任意）"
                value={form.department}
                onChange={handleChange("department")}
              />

              <Field
                label="宛名（任意・空欄時はご担当者様）"
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

              <GuidePanel image={WEB_MAIL_CONFIG.images.point} large>
                <div>
                  <div className="mb-2 block text-lg font-bold text-[#082f5f]">
                    退職理由の補足
                  </div>
                  <label className="flex items-start gap-2 text-base leading-7">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.healthConditionNote}
                      onChange={handleChange("healthConditionNote")}
                    />
                    <span>
                      体調不良により勤務継続・電話応対が困難である旨を記載する
                      <span className="block text-sm text-slate-500">
                        本文冒頭の「退職に伴う書類を送付いたします。」の直後に追記されます。
                      </span>
                    </span>
                  </label>
                </div>
              </GuidePanel>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold text-[#082f5f]">
                  返却頂くもの
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7">
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
                  <div className="mt-3 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
                <div className="mb-2 block text-lg font-bold text-[#082f5f]">
                  私物返送
                </div>
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
                <div className="mb-2 block text-lg font-bold text-[#082f5f]">
                  返却物
                </div>
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

              <GuidePanel image={WEB_MAIL_CONFIG.images.gassho}>
                <div className="space-y-3 text-sm leading-7 text-slate-700">
                  <p>郵送物に入りきらない場合は、お手数ですが別送をご検討ください。</p>
                  <p className="font-bold text-slate-900">
                    会社側も回収物が残ってしまった場合は、貴方へ連絡を取らざるを得なくなります。
                  </p>
                  <p className="font-bold text-slate-900">
                    やり取りを減らすためにも、返却はしておきましょう。
                  </p>
                </div>
              </GuidePanel>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold text-[#082f5f]">
                  住民税
                </div>
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

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        WEB_MAIL_CONFIG.paths.nextStepResidentTax,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    className="w-full rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-[#075985] hover:bg-sky-100"
                  >
                    ご不明な方はこちら
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        WEB_MAIL_CONFIG.paths.residentTaxGuide,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100"
                  >
                    住民税の解説を見る
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-sky-100 bg-white p-0 shadow-sm">
              <div className="px-6 pt-6">
                <div className="mb-6 rounded-2xl border-2 border-red-300 bg-red-50 p-6 text-center text-xl font-bold leading-8 text-red-700">
                  この画面で最終確認してから進んでください。（訂正できません）
                  <br />
                  完了後はすぐにPDFをダウンロードしてください（再発行できません）。
                </div>
              </div>

              <div className="px-3 pb-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    全体像を縮小表示しています。
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="rounded-lg bg-[#145da0] px-3 py-2 text-xs font-bold text-white"
                  >
                    拡大して確認
                  </button>
                </div>

                <div className="w-full overflow-hidden rounded-xl border bg-white">
                  <div
                    className="mx-auto w-fit origin-top"
                    style={{
                      zoom: 0.40,
                    }}
                  >
                    <LetterSheetPreview
                      preview={preview}
                      bodySections={bodySections}
                      showSample={true}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-3">
              <GuidePanel image={WEB_MAIL_CONFIG.images.think}>
                <p className="text-sm font-bold leading-7 text-slate-900">
                  会社側が退職届を確認した後に発生しやすいやり取りを、この送り状で先に整理しておきます。
                </p>
              </GuidePanel>

              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 pr-5 shadow-sm sm:pr-36">
                <h2 className="text-xl font-black text-[#082f5f]">次の決済画面</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  現在は無料期間中です。ここまで確認できたら、このまま次へ進めます。
                </p>

                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm text-slate-600">現在の料金</div>
                  <div className="mt-1 text-2xl font-black text-emerald-700">
                    {displayFinalPrice}円
                  </div>
                  <div className="mt-2 text-sm text-emerald-700">
                    {WEB_MAIL_CONFIG.freeCampaignLabel}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => {
                    const saved = saveHandoffData();
                    const checkoutRaw = sessionStorage.getItem(CHECKOUT_HANDOFF_KEY);

                    if (!saved || !checkoutRaw) {
                      alert(
                        "確認画面へ進むための情報保存に失敗しました。入力内容を確認して、もう一度お試しください。"
                      );
                      return;
                    }

                    window.location.href = WEB_MAIL_CONFIG.paths.checkout;
                  }}
                  className="mt-4 w-full rounded-xl bg-[#145da0] py-3 font-bold text-white disabled:bg-gray-300"
                >
                  内容を確認して、次へ進む（今は無料）
                </button>

                <img
                  src={WEB_MAIL_CONFIG.images.thumbsUp}
                  alt="退職ばあ様"
                  className="mt-4 h-28 w-auto object-contain sm:absolute sm:right-4 sm:top-4 sm:mt-0 sm:h-32"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  saveReturnToRetirementPageData();
                  window.location.href = WEB_MAIL_CONFIG.paths.retirementTop;
                }}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-700 hover:bg-slate-50"
              >
                退職届作成ページへ戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-3">
          <div className="mx-auto flex h-full max-w-[900px] flex-col rounded-2xl bg-white">
            <div className="flex items-center justify-between border-b p-3">
              <div className="text-sm font-bold">拡大プレビュー</div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white"
              >
                閉じる
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
              <div className="w-[794px]">
                <LetterSheetPreview
                  preview={preview}
                  bodySections={bodySections}
                  showSample={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function GuidePanel({
  image,
  children,
  large = false,
}: {
  image: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div
      className={
        large
          ? "flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left"
          : "flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
      }
    >
      <img
        src={image}
        alt="退職ばあ様"
        className={
          large
            ? "h-32 w-28 shrink-0 object-contain sm:h-40 sm:w-36"
            : "h-20 w-16 shrink-0 object-contain sm:h-24 sm:w-20"
        }
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
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
      <label className="mb-1 block text-lg font-bold text-[#082f5f]">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 p-3 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
      <label className="mb-1 block text-lg font-bold text-[#082f5f]">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-slate-300 p-3 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
      />
    </div>
  );
}
