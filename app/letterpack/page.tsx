"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

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

const LETTERPACK_HANDOFF_KEY = "letterpack-handoff-v1";
const LETTERPACK_FORM_KEY = "letterpack-form-v1";

const TEMPLATE_PDF_SRC = "/letter-pack-light.pdf";
const FONT_SRC = "/fonts/NotoSansJP-Regular.ttf";
const DEFAULT_ITEM_NAME = "退職書類";

const LETTERPACK_LAYOUT = {
  toZip: {
    x: 270,
    top: 50,
    fontSize: 38,
    letterSpacing: 33.5,
  },

  toAddress: {
    x: 210,
    top: 170,
    width: 230,
    fontSize: 15,
    lineHeight: 50,
  },

  toName: {
    x: 210,
    top: 250,
    width: 230,
    fontSize: 13,
    lineHeight: 16,
  },

  fromZip: {
    x: 210,
    top: 330,
    fontSize: 9,
    letterSpacing: 8,
  },

  fromAddress: {
    x: 210,
    top: 350,
    width: 230,
    fontSize: 12,
    lineHeight: 40,
  },

  fromName: {
    x: 210,
    top: 425,
    width: 180,
    fontSize: 14,
    lineHeight: 15,
  },

  itemName: {
    x: 300,
    top: 500,
    width: 170,
    fontSize: 20,
    lineHeight: 15,
  },
} as const;

const emptyForm: LetterpackForm = {
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

function zipToDigits(value: string) {
  return (value || "").replace(/\D/g, "").slice(0, 7);
}

function withSama(value: string) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "ご担当者";
  return trimmed.replace(/様/g, "");
}

function joinLines(...values: string[]) {
  return values
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join("\n");
}

function topToPdfY(pageHeight: number, top: number, fontSize: number) {
  return pageHeight - top - fontSize;
}

function sanitizeItemName(value?: string) {
  const trimmed = (value || "").trim();
  return trimmed || DEFAULT_ITEM_NAME;
}

function sanitizeForm(input?: Partial<LetterpackForm> | Partial<LetterpackHandoff>): LetterpackForm {
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

function wrapText(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string[] {
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

    if (current) {
      lines.push(current);
    }
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
  if (!res.ok) {
    throw new Error(`Failed to load asset: ${src}`);
  }
  return res.arrayBuffer();
}

async function buildLetterpackPdf(formInput: LetterpackForm): Promise<Uint8Array> {
  const form = sanitizeForm(formInput);

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

export default function LetterpackPage() {
  const [form, setForm] = useState<LetterpackForm>(emptyForm);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [zipLoading, setZipLoading] = useState({
    company: false,
    sender: false,
  });
  const [previewUrl, setPreviewUrl] = useState("");
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);

  const previewUrlRef = useRef("");
  const lastFetchedCompanyZipRef = useRef("");
  const lastFetchedSenderZipRef = useRef("");

  useEffect(() => {
    try {
      const savedForm = sessionStorage.getItem(LETTERPACK_FORM_KEY);
      if (savedForm) {
        const parsed = JSON.parse(savedForm) as Partial<LetterpackForm>;
        setForm(sanitizeForm(parsed));
        setLoaded(true);
        return;
      }

      const handoffText = sessionStorage.getItem(LETTERPACK_HANDOFF_KEY);
      if (!handoffText) {
        setError("送り状ページからの引き継ぎデータが見つかりません。");
        setLoaded(true);
        return;
      }

      const handoff = JSON.parse(handoffText) as Partial<LetterpackHandoff>;
      setForm(sanitizeForm(handoff));
    } catch {
      setError("引き継ぎデータの読み込みに失敗しました。");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    sessionStorage.setItem(LETTERPACK_FORM_KEY, JSON.stringify(sanitizeForm(form)));
  }, [form, loaded]);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    const run = async () => {
      try {
        setError("");
        const pdfBytes = await buildLetterpackPdf(form);
        if (cancelled) return;

        const safePdfBytes = Uint8Array.from(pdfBytes);
        const blob = new Blob([safePdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch {
        if (!cancelled) {
          setError("PDFプレビューの生成に失敗しました。");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [form, loaded]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const recipientBlock = useMemo(() => {
    return joinLines(form.companyName, withSama(form.recipientName));
  }, [form.companyName, form.recipientName]);

  const updateField = (key: keyof LetterpackForm, value: string) => {
    setForm((prev) => {
      const next: LetterpackForm = {
        ...prev,
        [key]:
          key === "companyZip" || key === "senderZip"
            ? normalizeZip(value)
            : value,
      };

      if (key === "itemName") {
        next.itemName = value;
      }

      return next;
    });
  };

  const fetchAddressFromZip = async (
    zip: string,
    target: "companyAddress" | "senderAddress",
    loadingKey: "company" | "sender"
  ) => {
    const digits = zipToDigits(zip);
    if (digits.length !== 7) return;

    setZipLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const res = await fetch(`/api/zipcode?zipcode=${digits}`, {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const address = typeof data?.address === "string" ? data.address.trim() : "";
      if (!address) return;

      setForm((prev) => {
        if ((prev[target] || "").trim()) return prev;
        return {
          ...prev,
          [target]: address,
        };
      });
    } catch {
      //
    } finally {
      setZipLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  useEffect(() => {
    if (!loaded) return;
    const digits = zipToDigits(form.companyZip);

    if (digits.length !== 7) {
      lastFetchedCompanyZipRef.current = "";
      return;
    }

    if (lastFetchedCompanyZipRef.current === digits) return;

    lastFetchedCompanyZipRef.current = digits;
    void fetchAddressFromZip(form.companyZip, "companyAddress", "company");
  }, [form.companyZip, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const digits = zipToDigits(form.senderZip);

    if (digits.length !== 7) {
      lastFetchedSenderZipRef.current = "";
      return;
    }

    if (lastFetchedSenderZipRef.current === digits) return;

    lastFetchedSenderZipRef.current = digits;
    void fetchAddressFromZip(form.senderZip, "senderAddress", "sender");
  }, [form.senderZip, loaded]);

  const handleDownloadPdf = async () => {
    try {
      setIsBuildingPdf(true);
      setError("");

      const pdfBytes = await buildLetterpackPdf(form);
      const safePdfBytes = Uint8Array.from(pdfBytes);
      const blob = new Blob([safePdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "letter-pack-output.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("PDFの保存に失敗しました。");
    } finally {
      setIsBuildingPdf(false);
    }
  };

  const handleReset = () => {
    sessionStorage.removeItem(LETTERPACK_FORM_KEY);
    location.reload();
  };

  const handleSkip = () => {
    window.location.href = "/life-plan";
  };

  if (!loaded) {
    return <div className="p-8">読み込み中...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1400px] p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">レターパック入力・出力</h1>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">入力</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  宛先会社名
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  宛先担当者名
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.recipientName}
                  onChange={(e) => updateField("recipientName", e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  レターパック本体に「様」が印字されているため、PDFには様を付けずに出力します。
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  宛先郵便番号
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.companyZip}
                  onChange={(e) => updateField("companyZip", e.target.value)}
                  placeholder="123-4567"
                />
                {zipLoading.company ? (
                  <p className="mt-1 text-xs text-slate-500">住所取得中...</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  宛先住所
                </label>
                <textarea
                  className="min-h-[88px] w-full rounded-lg border px-3 py-2"
                  value={form.companyAddress}
                  onChange={(e) =>
                    updateField("companyAddress", e.target.value)
                  }
                />
              </div>

              <hr className="my-2" />

              <div>
                <label className="mb-1 block text-sm font-medium">
                  差出人名
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.senderName}
                  onChange={(e) => updateField("senderName", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  差出人郵便番号
                </label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.senderZip}
                  onChange={(e) => updateField("senderZip", e.target.value)}
                  placeholder="123-4567"
                />
                {zipLoading.sender ? (
                  <p className="mt-1 text-xs text-slate-500">住所取得中...</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  差出人住所
                </label>
                <textarea
                  className="min-h-[88px] w-full rounded-lg border px-3 py-2"
                  value={form.senderAddress}
                  onChange={(e) =>
                    updateField("senderAddress", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">品名</label>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.itemName}
                  onChange={(e) => updateField("itemName", e.target.value)}
                  placeholder={DEFAULT_ITEM_NAME}
                />
                <p className="mt-1 text-xs text-slate-500">
                  空欄でもPDFには「{DEFAULT_ITEM_NAME}」で出力されます。
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-lg border px-4 py-2"
              >
                引き継ぎ内容で再読込
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isBuildingPdf}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-blue-300"
              >
                {isBuildingPdf ? "PDFを作成中..." : "PDFを保存する"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full rounded-lg border px-4 py-2 text-slate-700"
              >
                出力後、自分で出す場合
              </button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow">
            <h2 className="mb-4 text-lg font-semibold">PDFプレビュー</h2>

            <div className="overflow-hidden rounded-xl border bg-slate-50">
              {previewUrl ? (
                <iframe
                  title="letterpack-pdf-preview"
                  src={previewUrl}
                  className="h-[980px] w-full"
                />
              ) : (
                <div className="flex h-[980px] items-center justify-center text-sm text-slate-500">
                  プレビュー生成中...
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              文字座標は LETTERPACK_LAYOUT だけで調整できます。
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
