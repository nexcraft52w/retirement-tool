"use client";

import { useEffect, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";
type DepositDocsMode = "none" | "has";
type PensionDocType = "none" | "pension_book" | "basic_notice";
type ResidentTaxType = "collect" | "self" | "none";

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
  mailForm: WebMailForm;
};

type LetterpackForm = {
  companyName: string;
  recipientName: string;
  companyZip: string;
  companyAddress: string;
  senderName: string;
  senderZip: string;
  senderAddress: string;
  itemName: string;
};

type LetterpackHandoff = Partial<LetterpackForm>;

const CHECKOUT_HANDOFF_KEY = "checkout-handoff-v1";
const LETTERPACK_HANDOFF_KEY = "letterpack-handoff-v1";
const LETTERPACK_FORM_KEY = "letterpack-form-v1";

const TEMPLATE_PDF_SRC = "/letter-pack-light.pdf";
const FONT_SRC = "/fonts/NotoSansJP-Regular.ttf";
const DEFAULT_ITEM_NAME = "退職書類";

const LETTERPACK_LAYOUT = {
  toZip: { x: 270, top: 50, fontSize: 38, letterSpacing: 33.5 },
  toAddress: { x: 210, top: 170, width: 230, fontSize: 15, lineHeight: 50 },
  toName: { x: 210, top: 250, width: 230, fontSize: 13, lineHeight: 16 },
  fromZip: { x: 210, top: 330, fontSize: 9, letterSpacing: 8 },
  fromAddress: { x: 210, top: 350, width: 230, fontSize: 12, lineHeight: 40 },
  fromName: { x: 210, top: 425, width: 180, fontSize: 14, lineHeight: 15 },
  itemName: { x: 300, top: 500, width: 170, fontSize: 20, lineHeight: 15 },
} as const;

const emptyLetterpackForm: LetterpackForm = {
  companyName: "",
  recipientName: "",
  companyZip: "",
  companyAddress: "",
  senderName: "",
  senderZip: "",
  senderAddress: "",
  itemName: DEFAULT_ITEM_NAME,
};

function normalizeZip(value: string) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function displayZip(value: string) {
  return (value || "").replace(/\D/g, "").slice(0, 7);
}

function withSama(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "ご担当者様";
  return trimmed.replace(/様+$/, "") + " 様";
}

function withSingleSama(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "ご担当者様";
  return trimmed.replace(/様+$/, "") + "様";
}

function joinAddress(a?: string, b?: string) {
  return [a?.trim(), b?.trim()].filter(Boolean).join(" ");
}

function joinLines(...values: string[]) {
  return values
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join("\n");
}

function sanitizeItemName(value?: string) {
  const trimmed = (value || "").trim();
  return trimmed || DEFAULT_ITEM_NAME;
}

function sanitizeLetterpackForm(input?: Partial<LetterpackForm> | Partial<LetterpackHandoff>): LetterpackForm {
  return {
    companyName: (input?.companyName || "").trim(),
    recipientName: (input?.recipientName || "").trim(),
    companyZip: normalizeZip(input?.companyZip || ""),
    companyAddress: (input?.companyAddress || "").trim(),
    senderName: (input?.senderName || "").trim(),
    senderZip: normalizeZip(input?.senderZip || ""),
    senderAddress: (input?.senderAddress || "").trim(),
    itemName: sanitizeItemName(input?.itemName),
  };
}

function buildRequestedDocsBlock(baseDocs: string[], extraDocs: string[]) {
  const lines: string[] = [];
  if (baseDocs.length > 0) lines.push(baseDocs.join("・"));
  if (extraDocs.length > 0) lines.push(extraDocs.join("・"));
  return lines.join("\n");
}

function buildCoverLetterSections(handoff: CheckoutHandoff) {
  const form = handoff.mailForm;
  const sections: string[] = [];

  const requestedDocsBase = ["源泉徴収票", "最後の給与明細", "離職票"];
  const requestedDocsExtra: string[] = [];

  if (form.depositDocsMode === "has") {
    if (form.pensionDocType === "pension_book") requestedDocsExtra.push("年金手帳");
    if (form.pensionDocType === "basic_notice") requestedDocsExtra.push("基礎年金番号通知書");
    if (form.depositEmploymentInsurance) requestedDocsExtra.push("雇用保険被保険者証");
    if (form.depositMyNumberCard) requestedDocsExtra.push("マイナンバーカード");
  }

  const residentTaxText =
    form.residentTaxType === "collect"
      ? "住民税は一括徴収でお願いいたします。"
      : form.residentTaxType === "self"
      ? "住民税は普通徴収に切り替えていただけますと幸いです。"
      : "";

  sections.push("拝啓");
  sections.push("お世話になっております。\n退職に伴う書類を送付いたします。");

  if (form.belongingsMode === "request") {
    sections.push(
      `お手数をおかけしますが、私物は着払いにて送付をお願いいたします。${
        form.belongingsNote ? `\n私物内容：${form.belongingsNote}` : ""
      }`
    );
  }

  if (form.returnItemsMode === "return") {
    sections.push(
      `貸与頂いていましたものをお返しいたします。${
        form.returnItemsNote ? `\n返却物：${form.returnItemsNote}` : ""
      }`
    );
  }

  if (residentTaxText) sections.push(residentTaxText);

  sections.push(
    `${buildRequestedDocsBlock(
      requestedDocsBase,
      requestedDocsExtra
    )}\nにつきましては、こちらの書類の送り元住所へお送りください。`
  );

  sections.push("ご確認のほど、よろしくお願いいたします。");
  return sections;
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const lines: string[] = [];
  const paragraphs = (text || "").replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const char of Array.from(paragraph)) {
      const test = current + char;
      const width = font.widthOfTextAtSize(test, fontSize);

      if (width > maxWidth) {
        if (current) {
          lines.push(current);
          current = char;
        } else {
          lines.push(test);
          current = "";
        }
      } else {
        current = test;
      }
    }

    if (current) lines.push(current);
  }

  return lines;
}

function drawWrappedText(params: {
  page: any;
  text: string;
  x: number;
  top: number;
  width: number;
  font: any;
  fontSize: number;
  lineHeight: number;
}) {
  const { page, text, x, top, width, font, fontSize, lineHeight } = params;
  const pageHeight = page.getHeight();
  const lines = wrapText(text, width, font, fontSize);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: pageHeight - top - fontSize - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

function topToPdfY(pageHeight: number, top: number, fontSize: number) {
  return pageHeight - top - fontSize;
}

function drawZipText(params: {
  page: any;
  zip: string;
  x: number;
  top: number;
  font: any;
  fontSize: number;
  letterSpacing: number;
}) {
  const { page, zip, x, top, font, fontSize, letterSpacing } = params;
  const digits = displayZip(zip);
  const pageHeight = page.getHeight();
  const y = topToPdfY(pageHeight, top, fontSize);

  Array.from(digits).forEach((ch, index) => {
    page.drawText(ch, {
      x: x + index * letterSpacing,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

async function fetchArrayBufferStrict(src: string) {
  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load asset: ${src}`);
  return res.arrayBuffer();
}

async function loadJapaneseFont(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = await fetchArrayBufferStrict(FONT_SRC);
  return pdfDoc.embedFont(fontBytes, { subset: false });
}

async function buildCoverLetterPdf(handoff: CheckoutHandoff): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await loadJapaneseFont(pdfDoc);
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const width = page.getWidth();
  const height = page.getHeight();

  const pxPerMm = 3.6;
  const mm = (value: number) => value * pxPerMm * 0.75;

  page.drawText("送り状", {
    x: width / 2 - font.widthOfTextAtSize("送り状", 20) / 2,
    y: height - 42,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });

  const senderText = joinLines(
    `〒${handoff.senderZip || ""}`,
    joinAddress(handoff.senderAddress1, handoff.senderAddress2),
    handoff.senderName || ""
  );

  drawWrappedText({
    page,
    text: senderText,
    x: width - mm(72),
    top: mm(60),
    width: mm(60),
    font,
    fontSize: 13,
    lineHeight: 23,
  });

  const recipientText = joinLines(
    handoff.companyName || "",
    handoff.department || "",
    withSingleSama(handoff.recipientName || "")
  );

  drawWrappedText({
    page,
    text: recipientText,
    x: mm(12),
    top: mm(38),
    width: mm(110),
    font,
    fontSize: 16,
    lineHeight: 28,
  });

  const sections = buildCoverLetterSections(handoff);
  let currentTop = mm(106);

  for (const section of sections) {
    const lines = wrapText(section, mm(168), font, 13);
    drawWrappedText({
      page,
      text: section,
      x: mm(12),
      top: currentTop,
      width: mm(168),
      font,
      fontSize: 13,
      lineHeight: 22,
    });
    currentTop += lines.length * 22 + 24;
  }

  page.drawText("敬具", {
    x: width - mm(24),
    y: mm(14),
    size: 13,
    font,
    color: rgb(0, 0, 0),
  });

  return pdfDoc.save();
}

async function buildLetterpackPdf(formInput: LetterpackForm): Promise<Uint8Array> {
  const form = sanitizeLetterpackForm(formInput);

  const [templateBytes, fontBytes] = await Promise.all([
    fetchArrayBufferStrict(TEMPLATE_PDF_SRC),
    fetchArrayBufferStrict(FONT_SRC),
  ]);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const font = await pdfDoc.embedFont(fontBytes, { subset: false });
  const page = pdfDoc.getPages()[0];

  const recipientBlock = joinLines(form.companyName, withSama(form.recipientName));

  drawZipText({
    page,
    zip: form.companyZip,
    x: LETTERPACK_LAYOUT.toZip.x,
    top: LETTERPACK_LAYOUT.toZip.top,
    font,
    fontSize: LETTERPACK_LAYOUT.toZip.fontSize,
    letterSpacing: LETTERPACK_LAYOUT.toZip.letterSpacing,
  });

  drawWrappedText({
    page,
    text: form.companyAddress,
    x: LETTERPACK_LAYOUT.toAddress.x,
    top: LETTERPACK_LAYOUT.toAddress.top,
    width: LETTERPACK_LAYOUT.toAddress.width,
    font,
    fontSize: LETTERPACK_LAYOUT.toAddress.fontSize,
    lineHeight: LETTERPACK_LAYOUT.toAddress.lineHeight,
  });

  drawWrappedText({
    page,
    text: recipientBlock,
    x: LETTERPACK_LAYOUT.toName.x,
    top: LETTERPACK_LAYOUT.toName.top,
    width: LETTERPACK_LAYOUT.toName.width,
    font,
    fontSize: LETTERPACK_LAYOUT.toName.fontSize,
    lineHeight: LETTERPACK_LAYOUT.toName.lineHeight,
  });

  drawZipText({
    page,
    zip: form.senderZip,
    x: LETTERPACK_LAYOUT.fromZip.x,
    top: LETTERPACK_LAYOUT.fromZip.top,
    font,
    fontSize: LETTERPACK_LAYOUT.fromZip.fontSize,
    letterSpacing: LETTERPACK_LAYOUT.fromZip.letterSpacing,
  });

  drawWrappedText({
    page,
    text: form.senderAddress,
    x: LETTERPACK_LAYOUT.fromAddress.x,
    top: LETTERPACK_LAYOUT.fromAddress.top,
    width: LETTERPACK_LAYOUT.fromAddress.width,
    font,
    fontSize: LETTERPACK_LAYOUT.fromAddress.fontSize,
    lineHeight: LETTERPACK_LAYOUT.fromAddress.lineHeight,
  });

  drawWrappedText({
    page,
    text: form.senderName,
    x: LETTERPACK_LAYOUT.fromName.x,
    top: LETTERPACK_LAYOUT.fromName.top,
    width: LETTERPACK_LAYOUT.fromName.width,
    font,
    fontSize: LETTERPACK_LAYOUT.fromName.fontSize,
    lineHeight: LETTERPACK_LAYOUT.fromName.lineHeight,
  });

  drawWrappedText({
    page,
    text: sanitizeItemName(form.itemName),
    x: LETTERPACK_LAYOUT.itemName.x,
    top: LETTERPACK_LAYOUT.itemName.top,
    width: LETTERPACK_LAYOUT.itemName.width,
    font,
    fontSize: LETTERPACK_LAYOUT.itemName.fontSize,
    lineHeight: LETTERPACK_LAYOUT.itemName.lineHeight,
  });

  return pdfDoc.save();
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const safeBytes = Uint8Array.from(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readCheckoutHandoff(): CheckoutHandoff | null {
  const raw = sessionStorage.getItem(CHECKOUT_HANDOFF_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as CheckoutHandoff;
}

function readLetterpackForm(checkout: CheckoutHandoff | null): LetterpackForm | null {
  const savedForm = sessionStorage.getItem(LETTERPACK_FORM_KEY);
  if (savedForm) return sanitizeLetterpackForm(JSON.parse(savedForm));

  const handoffText = sessionStorage.getItem(LETTERPACK_HANDOFF_KEY);
  if (handoffText) return sanitizeLetterpackForm(JSON.parse(handoffText));

  if (!checkout) return null;

  return sanitizeLetterpackForm({
    companyName: checkout.companyName,
    recipientName: checkout.recipientName,
    companyAddress: checkout.companyAddress,
    senderName: checkout.senderName,
    senderZip: checkout.senderZip,
    senderAddress: checkout.senderAddress || joinAddress(checkout.senderAddress1, checkout.senderAddress2),
    itemName: checkout.itemName,
  });
}

export default function SuccessPage() {
  const [isPaid, setIsPaid] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutHandoff | null>(null);
  const [letterpackForm, setLetterpackForm] = useState<LetterpackForm>(emptyLetterpackForm);
  const [error, setError] = useState("");
  const [isBuildingCoverLetter, setIsBuildingCoverLetter] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paidByUrl = params.get("paid") === "1";
      const paidByStorage = sessionStorage.getItem("web-mail-paid") === "true";

      if (!paidByUrl && !paidByStorage) {
        setIsPaid(false);
        return;
      }

      sessionStorage.setItem("web-mail-paid", "true");
      setIsPaid(true);

      const loadedCheckout = readCheckoutHandoff();
      if (!loadedCheckout) {
        setError("送り状データが見つかりません。郵送補助ページからやり直してください。");
        return;
      }

      const loadedLetterpack = readLetterpackForm(loadedCheckout);
      if (!loadedLetterpack) {
        setError("レターパック宛名データが見つかりません。郵送補助ページからやり直してください。");
        return;
      }

      setCheckout(loadedCheckout);
      setLetterpackForm(loadedLetterpack);
    } catch {
      setError("保存データの読み込みに失敗しました。");
    }
  }, []);

  const handleDownloadCoverLetter = async () => {
    if (!checkout) return;

    try {
      setIsBuildingCoverLetter(true);
      setError("");

      const pdfBytes = await buildCoverLetterPdf(checkout);
      downloadBytes(pdfBytes, "cover-letter.pdf");
    } catch {
      setError("送り状PDFの保存に失敗しました。");
    } finally {
      setIsBuildingCoverLetter(false);
    }
  };

  if (!isPaid) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-slate-900">決済情報を確認できません</h1>
          <p className="mt-3 text-sm text-slate-600">郵送補助ページからやり直してください。</p>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/web-mail";
            }}
            className="mt-6 w-full rounded-xl bg-slate-900 px-6 py-4 text-base font-bold text-white"
          >
            郵送補助ページへ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">PDF出力の準備が完了しました</h1>

        <p className="mt-4 text-sm text-slate-700">
          送り状PDFをダウンロードできます。必要な場合はレターパック宛名PDFも出力してください。
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleDownloadCoverLetter}
          disabled={isBuildingCoverLetter || !!error || !checkout}
          className="mt-6 w-full rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white hover:bg-green-700 disabled:bg-gray-300"
        >
          {isBuildingCoverLetter ? "送り状PDFを作成中..." : "送り状PDFをダウンロードする"}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/letterpack";
          }}
          disabled={!!error}
          className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-6 py-4 text-base font-bold text-slate-700 disabled:bg-gray-100 disabled:text-slate-400"
        >
          送り状ダウンロード後、次へ進む
        </button>

          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-700">
             ※必ずPDFをダウンロードしてください。ダウンロードしないままページを離れると、データを再取得できない場合があります。
          </div>




        <p className="mt-4 text-xs leading-6 text-slate-500">
          ※相手が受け取ったことが記録されるレターパックでの郵送方法を推奨いたします。
        </p>
      </div>
    </main>
  );
}
