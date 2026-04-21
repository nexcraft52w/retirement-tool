"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type SavedFormState = {
  name?: string;
  address?: string;
  companyName?: string;
  companyAddress?: string;
};

type ResidentTaxType = "collect" | "self" | "none";
type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";
type DepositDocsMode = "none" | "has";
type PensionDocType = "none" | "pension_book" | "basic_notice";

type WebMailForm = {
  department: string;
  recipientName: string;

  companyZip: string;
  companyAddress1: string;
  companyAddress2: string;
  companyPhone: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;
  senderPhone: string;

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

type EpisodeDiscountHandoff = {
  companyName?: string;
  companyAddress?: string;
  senderName?: string;
  senderAddress?: string;
  name?: string;
  address?: string;
  basePrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  discountedPrice?: number;
};

type PreviewData = {
  companyName: string;
  senderName: string;

  companyZip: string;
  companyAddress1: string;
  companyAddress2: string;
  companyPhone: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;
  senderPhone: string;

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
  companyZip: string;
  companyAddress1: string;
  companyAddress2: string;
  companyPhone: string;
  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;
  senderPhone: string;
  recipientName: string;
  department: string;
  itemName: string;
};

type LetterpackHandoff = {
  companyName: string;
  recipientName: string;
  companyZip: string;
  companyAddress: string;

  senderName: string;
  senderZip: string;
  senderAddress: string;

  itemName: string;
};


const STORAGE_KEY = "retirement-document-form-v1";
const EPISODE_DISCOUNT_HANDOFF_KEY = "episode-discount-handoff-v1";
const WEB_MAIL_FORM_STORAGE_KEY = "web-mail-form-v1";
const WEB_MAIL_NEXT_HANDOFF_KEY = "web-mail-next-handoff-v1";
const LETTERPACK_HANDOFF_KEY = "letterpack-handoff-v1";

const WEB_MAIL_BASE_PRICE = 1500;
const FONT_SRC = "/fonts/NotoSansJP-Regular.ttf";

const FREE_CAMPAIGN = true;
const FREE_CAMPAIGN_LABEL = "2026/5/9まで無料";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * テスト中は true
 * 本番時は false に戻す
 */
const DEBUG_FREE_DOWNLOAD = false;

/**
 * プレビューとPDFで共通化する座標定義
 * 単位は mm（A4基準）
 */
const LETTER_LAYOUT = {
  titleTop: 0,
  senderTop: 60,
  senderRight: 12,
  senderWidth: 60,

  receiverTop: 38,
  receiverLeft: 12,
  receiverWidth: 95,

  bodyTop: 106,
  bodyLeft: 12,
  bodyWidth: 168,

  closingRight: 12,
  closingBottom: 12,

  receiverCompanyFontSize: 18,
  receiverCompanyLineHeight: 24,
  receiverTextFontSize: 11,
  receiverTextLineHeight: 18,

  bodyFontSize: 10.5,
  bodyLineHeightPdf: 19,

  previewBaseFontSize: 13,
  previewBodyLineHeight: 2,
  previewSenderFontSize: 13,

  previewPageWidthPx: 760,
  previewPageHeightPx: 1074,
  previewPaddingPx: 48,
} as const;

const emptyForm: WebMailForm = {
  department: "",
  recipientName: "",

  companyZip: "",
  companyAddress1: "",
  companyAddress2: "",
  companyPhone: "",

  senderZip: "",
  senderAddress1: "",
  senderAddress2: "",
  senderPhone: "",

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

const normalizePhone = (value: string) => {
  return value.replace(/[^\d-]/g, "").slice(0, 15);
};

const joinAddress = (a: string, b: string) => {
  return [a?.trim(), b?.trim()].filter(Boolean).join(" ");
};


const withSingleSama = (value: string) => {
  const t = (value ?? "").trim();
  if (!t) return "ご担当者様";
  return t.replace(/様+$/, "") + "様";
};

const mm = (value: number) => (value * 72) / 25.4;
const pdfYFromTopMm = (topMm: number) => A4_HEIGHT - mm(topMm);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFilePart(value: string) {
  return (value || "document")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .slice(0, 40);
}

function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number
) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const char of paragraph) {
      const next = current + char;
      const width = font.widthOfTextAtSize(next, fontSize);

      if (width <= maxWidth || current.length === 0) {
        current = next;
      } else {
        lines.push(current);
        current = char;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

async function loadArrayBuffer(path: string) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load asset: ${path}`);
  }
  return await res.arrayBuffer();
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

export default function WebMailPage() {
  const [form, setForm] = useState<WebMailForm>(emptyForm);
  const [companyName, setCompanyName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [basePrice, setBasePrice] = useState(WEB_MAIL_BASE_PRICE);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(WEB_MAIL_BASE_PRICE);
  const [zipcodeError, setZipcodeError] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const sendCount = async (type: "view" | "pdf" | "postal") => {
    try {
      await fetch("/api/count", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });
    } catch (error) {
      console.error("[count send error]", error);
    }
  };


  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const handoffRaw = sessionStorage.getItem(EPISODE_DISCOUNT_HANDOFF_KEY);
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_FORM_STORAGE_KEY);

      let nextForm: WebMailForm = { ...emptyForm };
      let nextCompanyName = "";
      let nextSenderName = "";
      let nextBasePrice = WEB_MAIL_BASE_PRICE;
      let nextDiscountAmount = 0;
      let nextFinalPrice = WEB_MAIL_BASE_PRICE;

      if (raw) {
        const saved: SavedFormState = JSON.parse(raw);
        nextCompanyName = saved.companyName || "";
        nextSenderName = saved.name || "";
        nextForm.companyAddress1 = saved.companyAddress || "";
        nextForm.senderAddress1 = saved.address || "";
      }

      if (handoffRaw) {
        const handoff: EpisodeDiscountHandoff = JSON.parse(handoffRaw);

        nextCompanyName = handoff.companyName || nextCompanyName;
        nextSenderName = handoff.senderName || handoff.name || nextSenderName;

        if (!nextForm.companyAddress1) {
          nextForm.companyAddress1 = handoff.companyAddress || "";
        }

        if (!nextForm.senderAddress1) {
          nextForm.senderAddress1 = handoff.senderAddress || handoff.address || "";
        }

        nextBasePrice =
          typeof handoff.basePrice === "number"
            ? handoff.basePrice
            : WEB_MAIL_BASE_PRICE;

        nextFinalPrice =
          typeof handoff.finalPrice === "number"
            ? handoff.finalPrice
            : typeof handoff.discountedPrice === "number"
              ? handoff.discountedPrice
              : nextBasePrice;

        nextDiscountAmount =
          typeof handoff.discountAmount === "number"
            ? handoff.discountAmount
            : Math.max(0, nextBasePrice - nextFinalPrice);
      }

      if (webMailRaw) {
        const savedWebMail: Partial<WebMailForm> = JSON.parse(webMailRaw);
        nextForm = {
          ...nextForm,
          ...savedWebMail,
        };
      }

      setForm({
        ...emptyForm,
        ...nextForm,
        companyPhone: nextForm.companyPhone ?? "",
        senderPhone: nextForm.senderPhone ?? "",
        itemName: nextForm.itemName ?? "書類",
        pensionDocType: nextForm.pensionDocType ?? "none",
      });
      setCompanyName(nextCompanyName);
      setSenderName(nextSenderName);
      setBasePrice(nextBasePrice);
      setDiscountAmount(nextDiscountAmount);
      setFinalPrice(nextFinalPrice);
    } catch (e) {
      console.error(e);
      setForm(emptyForm);
      setCompanyName("");
      setSenderName("");
      setBasePrice(WEB_MAIL_BASE_PRICE);
      setDiscountAmount(0);
      setFinalPrice(WEB_MAIL_BASE_PRICE);
    }
  }, []);

  useEffect(() => {
    sendCount("view");
  }, []);

  useEffect(() => {
    sessionStorage.setItem(WEB_MAIL_FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

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

      companyZip: form.companyZip || "",
      companyAddress1: form.companyAddress1 || "未入力",
      companyAddress2: form.companyAddress2 || "",
      companyPhone: form.companyPhone ?? "",

      senderZip: form.senderZip || "",
      senderAddress1: form.senderAddress1 || "未入力",
      senderAddress2: form.senderAddress2 || "",
      senderPhone: form.senderPhone ?? "",

      itemName: (form.itemName ?? "").trim() || "書類",

      basePrice: WEB_MAIL_BASE_PRICE,
      discountAmount: WEB_MAIL_BASE_PRICE,
      finalPrice: 0,

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
  }, [form, companyName, senderName, basePrice, discountAmount, finalPrice]);

  const bodySections = useMemo(() => buildLetterBodySections(preview), [preview]);

  useEffect(() => {
    const nextPageHandoff: NextPageAddressHandoff = {
      companyName: preview.companyName,
      senderName: preview.senderName,
      companyZip: preview.companyZip,
      companyAddress1: preview.companyAddress1,
      companyAddress2: preview.companyAddress2,
      companyPhone: preview.companyPhone,
      senderZip: preview.senderZip,
      senderAddress1: preview.senderAddress1,
      senderAddress2: preview.senderAddress2,
      senderPhone: preview.senderPhone,
      recipientName: preview.recipientName,
      department: preview.department,
      itemName: preview.itemName,
    };

    const letterpackHandoff: LetterpackHandoff = {
      companyName: preview.companyName,
      recipientName: preview.recipientName,
      companyZip: preview.companyZip,
      companyAddress: joinAddress(preview.companyAddress1, preview.companyAddress2),

      senderName: preview.senderName,
      senderZip: preview.senderZip,
      senderAddress: joinAddress(preview.senderAddress1, preview.senderAddress2),

      itemName: preview.itemName,
    };

    sessionStorage.setItem(
      WEB_MAIL_NEXT_HANDOFF_KEY,
      JSON.stringify(nextPageHandoff)
    );
    sessionStorage.setItem(
      LETTERPACK_HANDOFF_KEY,
      JSON.stringify(letterpackHandoff)
    );
  }, [preview]);

  const fetchAddress = async (zip: string, type: "company" | "sender") => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length !== 7) return;

    try {
      setZipcodeError("");

      const res = await fetch(`/api/zipcode?zipcode=${digits}`);
      const data = await res.json();

      if (!res.ok) {
        setZipcodeError("住所検索に失敗しました。/api/zipcode を確認してください。");
        return;
      }

      const address =
        data.address ||
        `${data.prefecture ?? ""}${data.city ?? ""}${data.town ?? ""}`;

      if (!address) {
        setZipcodeError("住所検索の返却形式が想定と異なります。");
        return;
      }

      setForm((prev) => {
        if (type === "company") {
          return { ...prev, companyAddress1: address };
        }
        return { ...prev, senderAddress1: address };
      });
    } catch (e) {
      console.error("zipcode fetch error", e);
      setZipcodeError("住所検索で通信エラーが発生しました。");
    }
  };

  useEffect(() => {
    const digits = form.companyZip.replace(/\D/g, "");
    if (digits.length === 7) {
      fetchAddress(form.companyZip, "company");
    }
  }, [form.companyZip]);

  useEffect(() => {
    const digits = form.senderZip.replace(/\D/g, "");
    if (digits.length === 7) {
      fetchAddress(form.senderZip, "sender");
    }
  }, [form.senderZip]);

  const handleChange =
    (key: keyof WebMailForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = e.target as HTMLInputElement;
      let value: string | boolean =
        target.type === "checkbox" ? target.checked : target.value;

      if (key === "companyZip" || key === "senderZip") {
        value = normalizeZip(String(value));
      }

      if (key === "companyPhone" || key === "senderPhone") {
        value = normalizePhone(String(value));
      }

      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    };

  const canGenerate =
    !!form.companyAddress1 &&
    !!form.senderAddress1 &&
    !!form.recipientName &&
    !!preview.itemName;

  const canDownload = isPaid || DEBUG_FREE_DOWNLOAD;

  const generateCoverPdf = async () => {
    if (!canDownload) return;

    setIsGeneratingCover(true);
    try {
      const fontBytes = await loadArrayBuffer(FONT_SRC);

      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const font = await pdfDoc.embedFont(fontBytes, { subset: false });
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      const black = rgb(0, 0, 0);

      const drawText = (
        text: string,
        x: number,
        y: number,
        size: number,
        options?: {
          maxWidth?: number;
          lineHeight?: number;
          align?: "left" | "right" | "center";
        }
      ) => {
        const lines = options?.maxWidth
          ? wrapText(text, options.maxWidth, font, size)
          : text.split("\n");

        const lineHeight = options?.lineHeight ?? size * 1.8;

        lines.forEach((line, index) => {
          const width = font.widthOfTextAtSize(line, size);
          let drawX = x;

          if (options?.align === "right") {
            drawX = x - width;
          } else if (options?.align === "center") {
            drawX = x - width / 2;
          }

          page.drawText(line, {
            x: drawX,
            y: y - index * lineHeight,
            size,
            font,
            color: black,
          });
        });

        return y - lines.length * lineHeight;
      };

      const senderBlockX = A4_WIDTH - mm(LETTER_LAYOUT.senderRight);
      let senderY = pdfYFromTopMm(LETTER_LAYOUT.senderTop);

      senderY = drawText(
        `〒${preview.senderZip || "未入力"}`,
        senderBlockX,
        senderY,
        LETTER_LAYOUT.bodyFontSize,
        { align: "right" }
      );
      senderY -= 2;

      senderY = drawText(
        `${preview.senderAddress1}${preview.senderAddress2 ? `\n${preview.senderAddress2}` : ""}`,
        senderBlockX,
        senderY,
        LETTER_LAYOUT.bodyFontSize,
        {
          align: "right",
          lineHeight: 16,
          maxWidth: mm(LETTER_LAYOUT.senderWidth),
        }
      );
      senderY -= 2;

      drawText(preview.senderName, senderBlockX, senderY, LETTER_LAYOUT.bodyFontSize, {
        align: "right",
      });

      let receiverY = pdfYFromTopMm(LETTER_LAYOUT.receiverTop);

      receiverY = drawText(
        preview.companyName,
        mm(LETTER_LAYOUT.receiverLeft),
        receiverY,
        LETTER_LAYOUT.receiverCompanyFontSize,
        {
          maxWidth: mm(LETTER_LAYOUT.receiverWidth),
          lineHeight: LETTER_LAYOUT.receiverCompanyLineHeight,
        }
      );

      if (preview.department) {
        receiverY -= 4;
        receiverY = drawText(
          preview.department,
          mm(LETTER_LAYOUT.receiverLeft),
          receiverY,
          LETTER_LAYOUT.receiverTextFontSize,
          {
            maxWidth: mm(LETTER_LAYOUT.receiverWidth),
            lineHeight: LETTER_LAYOUT.receiverTextLineHeight,
          }
        );
      }

      receiverY -= 2;
      drawText(
        preview.recipientName,
        mm(LETTER_LAYOUT.receiverLeft),
        receiverY,
        LETTER_LAYOUT.receiverTextFontSize,
        {
          maxWidth: mm(LETTER_LAYOUT.receiverWidth),
          lineHeight: LETTER_LAYOUT.receiverTextLineHeight,
        }
      );

      let bodyY = pdfYFromTopMm(LETTER_LAYOUT.bodyTop);

      bodySections.forEach((section, index) => {
        bodyY = drawText(
          section,
          mm(LETTER_LAYOUT.bodyLeft),
          bodyY,
          LETTER_LAYOUT.bodyFontSize,
          {
            maxWidth: mm(LETTER_LAYOUT.bodyWidth),
            lineHeight: LETTER_LAYOUT.bodyLineHeightPdf,
          }
        );

        if (index !== bodySections.length - 1) {
          bodyY -= 12;
        }
      });

      drawText(
        "敬具",
        A4_WIDTH - mm(LETTER_LAYOUT.closingRight),
        mm(LETTER_LAYOUT.closingBottom),
        LETTER_LAYOUT.bodyFontSize,
        { align: "right" }
      );

      const pdfBytes = await pdfDoc.save();
      const filename = `送り状_${sanitizeFilePart(preview.companyName)}.pdf`;
      const safePdfBytes = Uint8Array.from(pdfBytes);
            downloadBlob(new Blob([safePdfBytes], { type: "application/pdf" }), filename);
    } finally {
      setIsGeneratingCover(false);
    }
  };

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
                  <div>通常価格：{preview.basePrice}円</div>
                  {FREE_CAMPAIGN ? (
                   <div>無料期間適用：- {preview.basePrice}円</div>
                    ) : (
                    preview.discountAmount > 0 && (
                    <div>割引額：- {preview.discountAmount}円</div>
                    )
                    )}
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {FREE_CAMPAIGN ? "0円" : `${preview.finalPrice}円`}
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
                label="会社住所（郵便番号）"
                value={form.companyZip}
                onChange={handleChange("companyZip")}
                placeholder="123-4567"
              />
              <Field
                label="会社住所1"
                value={form.companyAddress1}
                onChange={handleChange("companyAddress1")}
              />
              <Field
                label="会社住所2"
                value={form.companyAddress2}
                onChange={handleChange("companyAddress2")}
              />
              <Field
                label="会社電話番号"
                value={form.companyPhone}
                onChange={handleChange("companyPhone")}
                placeholder="045-000-0000"
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
              <Field
                label="差出人電話番号"
                value={form.senderPhone}
                onChange={handleChange("senderPhone")}
                placeholder="045-000-0000"
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
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-0">
              <div className="px-6 pt-6">
                <h2 className="mb-4 text-center text-2xl font-bold">送り状プレビュー</h2>
              </div>
              <LetterSheetScreenPreview preview={preview} bodySections={bodySections} />
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold text-slate-900">次の決済画面</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                現在は無料期間中ですが、次の1ページはこのまま進んでください。
              </p>

            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm text-slate-600">現在の料金</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">
              0円
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
              window.location.href = "/letterpack";
              }}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-white disabled:bg-gray-300"
              >
              次の決済画面へ進む
            </button>
          </div>


            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 text-slate-700"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function LetterSheetScreenPreview({
  preview,
  bodySections,
}: {
  preview: PreviewData;
  bodySections: string[];
}) {
  return (
    <div className="overflow-auto px-6 pb-6">
      <div
        className="mx-auto overflow-hidden border bg-white shadow-sm"
        style={{
          width: "760px",
          height: "1074px",
        }}
      >
        <div
          style={{
            width: "760px",
            height: "1074px",
            padding: "48px",
            boxSizing: "border-box",
            background: "#fff",
            color: "#111",
            position: "relative",
            fontFamily: "sans-serif",
          }}
        >
          <LetterSheetContent preview={preview} bodySections={bodySections} />
        </div>
      </div>
    </div>
  );
}

function LetterSheetContent({
  preview,
  bodySections,
}: {
  preview: PreviewData;
  bodySections: string[];
}) {
  const pxPerMm = 3.6;
  const mul = (value: number) => `${value * pxPerMm}px`;

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          textAlign: "center",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        送り状
      </div>

      <div
        style={{
          position: "absolute",
          top: mul(60),
          right: mul(12),
          width: mul(60),
          textAlign: "right",
          fontSize: "13px",
          lineHeight: 1.8,
          whiteSpace: "pre-line",
          wordBreak: "break-word",
        }}
      >
        <div>〒{preview.senderZip || "未入力"}</div>
        <div>
          {preview.senderAddress1}
          {preview.senderAddress2 ? `\n${preview.senderAddress2}` : ""}
        </div>
        <div>{preview.senderName}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: mul(12),
          top: mul(38),
          width: mul(95),
          fontSize: "15px",
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 700 }}>
          {preview.companyName}
        </div>
        {preview.department ? <div>{preview.department}</div> : null}
        <div>{preview.recipientName}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: mul(12),
          top: mul(106),
          width: mul(168),
          fontSize: "13px",
          lineHeight: 2,
        }}
      >
        {bodySections.map((section, index) => (
          <p
            key={`${index}-${section}`}
            style={{
              margin: index === bodySections.length - 1 ? 0 : "0 0 28px 0",
              whiteSpace: "pre-line",
            }}
          >
            {section}
          </p>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          right: mul(12),
          bottom: mul(12),
          fontSize: "13px",
        }}
      >
        敬具
      </div>
    </>
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