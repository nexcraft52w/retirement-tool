"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type DocumentType = "wish" | "notice";

type FormState = {
  name: string;
  address: string;
  department: string;
  companyName: string;
  companyAddress: string;
  representativeName: string;
  retirementDate: string;
};

const DRAFT_KEY = "retirement-document-draft-v1";
const RETIREMENT_FORM_STORAGE_KEY = "retirement-document-form-v1";
const POSTAL_HANDOFF_KEY = "postal-discount-handoff-v1";
const WEB_MAIL_FORM_STORAGE_KEY = "web-mail-form-v1";
const COUNT_KEY = "retirement-counted-v1";
const SESSION_ID_KEY = "retirement-session-id-v1";

const POSTAL_BASE_PRICE = 1500;
const FREE_CAMPAIGN = true;

type PostalPricingState = {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
};

type WebMailSavedState = {
  version?: number;
  form?: {
    senderZip?: string;
    senderAddress1?: string;
    senderAddress2?: string;
    recipientName?: string;
    department?: string;
    itemName?: string;
    pensionDocType?: string;
    residentTaxMode?: string;
    returnItemsMode?: string;
    returnItemsNote?: string;
  };
  companyName?: string;
  companyAddress?: string;
  senderName?: string;
  basePrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  updatedAt?: string;
};

const KANJI_DIGITS = [
  "〇",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];

const toKanjiNumber = (num: number) => {
  if (num < 10) return KANJI_DIGITS[num];
  if (num === 10) return "十";
  if (num < 20) return `十${KANJI_DIGITS[num - 10]}`;
  if (num % 10 === 0) return `${KANJI_DIGITS[Math.floor(num / 10)]}十`;
  return `${KANJI_DIGITS[Math.floor(num / 10)]}十${KANJI_DIGITS[num % 10]}`;
};

const toKanjiYear = (year: number) => {
  return String(year)
    .split("")
    .map((digit) => KANJI_DIGITS[Number(digit)])
    .join("");
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

const countAccess = (type: string) => {
  const sessionId = getSessionId();

  fetch("/api/count", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, sessionId }),
  }).catch(() => {
    // 計測失敗でも画面動作は継続
  });
};

export default function RetirementDocumentToolMVP() {
  const [documentType, setDocumentType] = useState<DocumentType>("notice");

  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    department: "",
    companyName: "",
    companyAddress: "",
    representativeName: "",
    retirementDate: "",
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    try {
      const draftRaw = sessionStorage.getItem(DRAFT_KEY);
      const storedRaw = localStorage.getItem(RETIREMENT_FORM_STORAGE_KEY);
      const postalRaw = sessionStorage.getItem(POSTAL_HANDOFF_KEY);
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_FORM_STORAGE_KEY);

      const draft = draftRaw
        ? (JSON.parse(draftRaw) as {
            documentType?: DocumentType;
            form?: Partial<FormState>;
          })
        : null;

      const stored = storedRaw
        ? (JSON.parse(storedRaw) as Partial<FormState> & {
            documentType?: DocumentType;
          })
        : null;

      const postal = postalRaw
        ? (JSON.parse(postalRaw) as Partial<{
            documentType: DocumentType;
            senderName: string;
            senderAddress: string;
            senderDepartment: string;
            companyName: string;
            companyAddress: string;
            representativeName: string;
            retirementDate: string;
          }>)
        : null;

      const webMail = webMailRaw
        ? (JSON.parse(webMailRaw) as WebMailSavedState)
        : null;

      const nextDocumentType: DocumentType = "notice";

      const storedForm = stored
        ? (({
            name,
            address,
            department,
            companyName,
            companyAddress,
            representativeName,
            retirementDate,
          }) => ({
            name,
            address,
            department,
            companyName,
            companyAddress,
            representativeName,
            retirementDate,
          }))(stored)
        : {};

      const nextForm: FormState = {
        name: "",
        address: "",
        department: "",
        companyName: "",
        companyAddress: "",
        representativeName: "",
        retirementDate: "",
        ...storedForm,
        ...(draft?.form ?? {}),
      };

      if (postal) {
        nextForm.name = nextForm.name || postal.senderName || "";
        nextForm.address = nextForm.address || postal.senderAddress || "";
        nextForm.department =
          nextForm.department || postal.senderDepartment || "";
        nextForm.companyName = nextForm.companyName || postal.companyName || "";
        nextForm.companyAddress =
          nextForm.companyAddress || postal.companyAddress || "";
        nextForm.representativeName =
          nextForm.representativeName || postal.representativeName || "";
        nextForm.retirementDate =
          nextForm.retirementDate || postal.retirementDate || "";
      }

      if (webMail) {
        nextForm.name = nextForm.name || webMail.senderName || "";
        nextForm.companyName =
          nextForm.companyName || webMail.companyName || "";
        nextForm.companyAddress =
          nextForm.companyAddress || webMail.companyAddress || "";
        nextForm.address =
          nextForm.address ||
          [webMail.form?.senderAddress1, webMail.form?.senderAddress2]
            .filter(Boolean)
            .join(" ");
        nextForm.department =
          nextForm.department || webMail.form?.department || "";
        nextForm.representativeName =
          nextForm.representativeName || webMail.form?.recipientName || "";
      }

      setDocumentType(nextDocumentType);
      setForm(nextForm);
    } catch {
      // 壊れたデータは無視
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    const counted = sessionStorage.getItem(COUNT_KEY);
    if (counted) return;

    countAccess("view");
    sessionStorage.setItem(COUNT_KEY, "1");
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const draftPayload = {
      documentType,
      form,
    };

    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload));
    localStorage.setItem(
      RETIREMENT_FORM_STORAGE_KEY,
      JSON.stringify({
        ...form,
        documentType,
        updatedAt: new Date().toISOString(),
      }),
    );
  }, [documentType, form, isHydrated]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setHasInteracted(true);

    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = toKanjiYear(date.getFullYear());
    const month = toKanjiNumber(date.getMonth() + 1);
    const day = toKanjiNumber(date.getDate());
    return `${year}年${month}月${day}日`;
  };

  const formattedRetirementDate = formatDate(form.retirementDate);

  const printRef = useRef<HTMLDivElement | null>(null);

  const titleText = "退職届";

  const handlePrint = async () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      alert(
        "印刷用ウィンドウを開けませんでした。ポップアップブロックを確認してください。",
      );
      return;
    }

    countAccess("pdf");

    const html = printRef.current.outerHTML;

    const headHtml = Array.from(
      document.head.querySelectorAll("style, link[rel='stylesheet']"),
    )
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${titleText}</title>
          ${headHtml}
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }

            html, body {
              margin: 0;
              padding: 0;
              background: #fff !important;
              width: 210mm;
              min-height: 297mm;
            }

            body {
              overflow: visible !important;
            }

            .print-root {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              padding: 0;
              background: #fff !important;
            }

            .retirement-sheet {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              overflow: hidden !important;
              position: relative !important;
              background: #fff !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div class="print-root">${html}</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    const wait = (ms: number) =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const waitForImages = async () => {
      const images = Array.from(printWindow.document.images || []);
      if (images.length === 0) return;

      await Promise.all(
        images.map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
                return;
              }
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      );
    };

    const waitForFonts = async () => {
      try {
        const fontSet = (
          printWindow.document as Document & {
            fonts?: { ready?: Promise<unknown> };
          }
        ).fonts;

        if (fontSet?.ready) {
          await fontSet.ready;
        }
      } catch {
        // フォント待機不可でも続行
      }
    };

    const waitForStableLayout = async () => {
      await wait(500);

      await new Promise<void>((resolve) => {
        printWindow.requestAnimationFrame(() => {
          printWindow.requestAnimationFrame(() => resolve());
        });
      });

      await wait(300);
    };

    try {
      await waitForFonts();
      await waitForImages();
      await waitForStableLayout();

      printWindow.focus();
      printWindow.print();

      printWindow.onafterprint = () => {
        printWindow.close();
      };

      window.setTimeout(() => {
        try {
          if (!printWindow.closed) {
            printWindow.close();
          }
        } catch {
          // 何もしない
        }
      }, 60000);
    } catch {
      printWindow.focus();
      printWindow.print();
    }
  };

  const todayString = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const formattedSubmitDate = formatDate(todayString);

  const errors = {
    name: !form.name,
    department: !form.department,
    companyName: !form.companyName,
    representativeName: !form.representativeName,
    retirementDate: !form.retirementDate,
  };

  const hasError = Object.values(errors).some(Boolean);
  const showFieldErrors = hasInteracted;

  const missingItems = [
    errors.name ? "氏名" : null,
    errors.department ? "所属部署名" : null,
    errors.companyName ? "会社名" : null,
    errors.representativeName ? "代表取締役氏名" : null,
    errors.retirementDate ? "退職日" : null,
  ].filter(Boolean);

  const resetSavedData = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(POSTAL_HANDOFF_KEY);
    sessionStorage.removeItem(WEB_MAIL_FORM_STORAGE_KEY);
    localStorage.removeItem(RETIREMENT_FORM_STORAGE_KEY);

    setDocumentType("notice");
    setForm({
      name: "",
      address: "",
      department: "",
      companyName: "",
      companyAddress: "",
      representativeName: "",
      retirementDate: "",
    });
  };

  const resolvePostalPricing = (): PostalPricingState => {
    try {
      const raw = sessionStorage.getItem(POSTAL_HANDOFF_KEY);
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_FORM_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      const savedWebMail = webMailRaw
        ? (JSON.parse(webMailRaw) as WebMailSavedState)
        : null;

      const basePrice =
        typeof saved?.basePrice === "number"
          ? saved.basePrice
          : typeof savedWebMail?.basePrice === "number"
            ? savedWebMail.basePrice
            : POSTAL_BASE_PRICE;

      const finalPrice =
        typeof saved?.finalPrice === "number"
          ? saved.finalPrice
          : typeof saved?.discountedPriceMin === "number"
            ? saved.discountedPriceMin
            : typeof saved?.discountedPriceMax === "number"
              ? saved.discountedPriceMax
              : typeof savedWebMail?.finalPrice === "number"
                ? savedWebMail.finalPrice
                : FREE_CAMPAIGN
                  ? 0
                  : basePrice;

      const discountAmount =
        typeof saved?.discountAmount === "number"
          ? saved.discountAmount
          : typeof savedWebMail?.discountAmount === "number"
            ? savedWebMail.discountAmount
            : Math.max(0, basePrice - finalPrice);

      return {
        basePrice,
        discountAmount,
        finalPrice,
      };
    } catch {
      return {
        basePrice: POSTAL_BASE_PRICE,
        discountAmount: FREE_CAMPAIGN ? POSTAL_BASE_PRICE : 0,
        finalPrice: FREE_CAMPAIGN ? 0 : POSTAL_BASE_PRICE,
      };
    }
  };

  const saveCurrentRetirementData = () => {
    const now = new Date().toISOString();

    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        documentType,
        form,
      }),
    );

    localStorage.setItem(
      RETIREMENT_FORM_STORAGE_KEY,
      JSON.stringify({
        ...form,
        documentType,
        updatedAt: now,
      }),
    );

    try {
      const webMailRaw = sessionStorage.getItem(WEB_MAIL_FORM_STORAGE_KEY);
      if (!webMailRaw) return;

      const savedWebMail = JSON.parse(webMailRaw) as WebMailSavedState;
      const savedForm = savedWebMail.form ?? {};

      const nextWebMail: WebMailSavedState = {
        ...savedWebMail,
        version: savedWebMail.version ?? 2,
        companyName: form.companyName || savedWebMail.companyName || "",
        companyAddress:
          form.companyAddress || savedWebMail.companyAddress || "",
        senderName: form.name || savedWebMail.senderName || "",
        form: {
          ...savedForm,
          department: form.department || savedForm.department || "",
          senderAddress1: form.address || savedForm.senderAddress1 || "",
          recipientName:
            form.representativeName || savedForm.recipientName || "",
        },
        updatedAt: now,
      };

      sessionStorage.setItem(
        WEB_MAIL_FORM_STORAGE_KEY,
        JSON.stringify(nextWebMail),
      );
    } catch {
      // web-mail側の保存が壊れていても、退職届側の保存は継続
    }
  };

  const buildHandoffData = () => {
    const pricing = resolvePostalPricing();

    return {
      sourcePage: "/",
      returnPath: "/",
      documentType,
      documentTitle: titleText,
      companyName: form.companyName,
      senderName: form.name,
      senderDepartment: form.department,
      senderAddress: form.address,
      companyAddress: form.companyAddress,
      representativeName: form.representativeName,
      retirementDate: form.retirementDate,
      basePrice: pricing.basePrice,
      discountAmount: pricing.discountAmount,
      finalPrice: pricing.finalPrice,
      discountMin: pricing.discountAmount,
      discountMax: pricing.discountAmount,
      discountedPriceMin: pricing.finalPrice,
      discountedPriceMax: pricing.finalPrice,
      episodePosted: pricing.discountAmount > 0 && !FREE_CAMPAIGN,
      canGoBack: true,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleEpisodePost = () => {
    saveCurrentRetirementData();

    sessionStorage.setItem(
      POSTAL_HANDOFF_KEY,
      JSON.stringify(buildHandoffData()),
    );
    window.location.href = "/episode";
  };

  const handlePostalSupport = () => {
    saveCurrentRetirementData();

    countAccess("postal");

    sessionStorage.setItem(
      POSTAL_HANDOFF_KEY,
      JSON.stringify(buildHandoffData()),
    );
    window.location.href = "/web-mail";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="no-print overflow-hidden rounded-3xl border border-amber-300 bg-white shadow-sm">
          <img
            src="/images/taishoku-baasama/taishoku-tool-header-banner.png"
            alt="退職ツール"
            className="block h-auto w-full"
          />

          <div className="bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 sm:p-8">
            <div className="mb-4 inline-flex rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-semibold text-amber-800">
              退職届作成ツール
            </div>

            <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              退職届をかんたん作成
            </h1>

            <p className="max-w-3xl text-base leading-7 text-slate-700 md:text-lg">
              必要事項を入力すると、印刷用の退職届を作成できます。
              作成後はPDF保存・印刷をして、ご自身の状況に合わせて提出方法を選べます。
            </p>

            <div className="mt-6">
              <span className="inline-block text-sm font-medium text-slate-600">
                ↓ 下のフォームから入力を開始できます
              </span>
              <div className="mt-2 text-xs text-slate-400">
                ※入力内容はこのタブ内で一時保持されます。
              </div>
            </div>
          </div>
        </section>

        <section className="no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_180px] md:items-end">
            <div>
              <h2 className="mb-4 text-2xl font-bold">作成する書類</h2>
              <div className="rounded-2xl border border-slate-900 bg-slate-900 p-5 text-white">
                <div className="mb-2 text-xl font-semibold">退職届</div>
                <div className="leading-7 text-slate-200">
                  会社に退職の意思を正式に通知するための書類です。
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
                当ページは、退職方法や提出方法に迷われている方が、
                退職の意思を会社へ伝えやすくするための補助ページです。
                <br />
                郵送提出を想定しているため、このページでは退職届の作成に絞っています。
                退職願を作成したい場合は、用途に合った別のフォーマットをご利用ください。
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <img
                src="/images/taishoku-baasama/taishoku-baasama-half-guide.png"
                alt="退職届作成を案内する退職ばあ様"
                className="block h-36 w-36 object-contain sm:h-48 sm:w-48"
              />
            </div>
          </div>
        </section>

        <section className="no-print grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">入力フォーム</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  退職届に記載する内容を入力してください。
                </p>
              </div>
              <button
                type="button"
                onClick={resetSavedData}
                className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                入力をリセット
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">氏名</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="例：氏名 花子"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showFieldErrors && errors.name
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {showFieldErrors && errors.name && (
                  <p className="mt-1 text-sm text-red-500">氏名は必須です</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  所属部署名
                </label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="例：営業部"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showFieldErrors && errors.department
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {showFieldErrors && errors.department && (
                  <p className="mt-1 text-sm text-red-500">
                    所属部署名は必須です
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">会社名</label>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="例：株式会社〇〇〇"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showFieldErrors && errors.companyName
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {showFieldErrors && errors.companyName && (
                  <p className="mt-1 text-sm text-red-500">会社名は必須です</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  代表取締役氏名
                </label>
                <input
                  type="text"
                  name="representativeName"
                  value={form.representativeName}
                  onChange={handleChange}
                  placeholder="例：代表者 太郎"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showFieldErrors && errors.representativeName
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {showFieldErrors && errors.representativeName && (
                  <p className="mt-1 text-sm text-red-500">
                    代表取締役氏名は必須です
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">退職日</label>
                <input
                  type="date"
                  name="retirementDate"
                  value={form.retirementDate}
                  min={todayString}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    showFieldErrors && errors.retirementDate
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {showFieldErrors && errors.retirementDate && (
                  <p className="mt-1 text-sm text-red-500">退職日は必須です</p>
                )}
                {!errors.retirementDate && (
                  <p className="mt-1 text-sm text-slate-500">
                    今日以降の日付のみ選択できます
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="mb-4 text-2xl font-bold">確認画面</h2>

              <div className="space-y-4 leading-7 text-slate-700">
                <div>
                  <div className="text-sm text-slate-500">文書タイプ</div>
                  <div className="font-medium">{titleText}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">氏名</div>
                  <div className="font-medium">{form.name || "未入力"}</div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">所属部署名</div>
                  <div className="font-medium">
                    {form.department || "未入力"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">会社名</div>
                  <div className="font-medium">
                    {form.companyName || "未入力"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">代表取締役氏名</div>
                  <div className="font-medium">
                    {form.representativeName || "未入力"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">退職日</div>
                  <div className="font-medium">
                    {form.retirementDate || "未入力"}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div
                  className={`rounded-2xl border p-4 ${
                    hasError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-green-200 bg-green-50 text-green-800"
                  }`}
                >
                  {hasError ? (
                    <>
                      <div className="font-semibold">
                        未入力項目があります。すべて入力するまで印刷・PDF保存はできません。
                      </div>
                      <div className="mt-2 text-sm">
                        未入力: {missingItems.join("、")}
                      </div>
                    </>
                  ) : (
                    "出力可能な状態です。"
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="print-section rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <div className="no-print mb-6 grid gap-5 md:grid-cols-[1fr_220px] md:items-end">
            <div>
              <h2 className="mb-2 text-2xl font-bold">{titleText}プレビュー</h2>
              <p className="text-sm leading-7 text-slate-600">
                内容を確認したうえで、印刷またはPDF保存をしてください。
              </p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                氏名を入力して出力した後は、押印してから提出することをおすすめします。
                「確かに本人が作成・提出した書類です」と示しやすくなるためです。
                押印がないと、本人確認の面で不安が残る場合があります。
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <img
                src="/images/taishoku-baasama/taishoku-baasama-half-gassho.png"
                alt="退職届プレビューを案内する退職ばあ様"
                className="block h-32 w-32 object-contain sm:h-44 sm:w-44"
              />
            </div>
          </div>

          <div className="mb-8 flex justify-center overflow-hidden">
            <div className="[zoom:0.42] sm:[zoom:0.62] md:[zoom:1]">
              <div
                ref={printRef}
                className="retirement-sheet relative mx-auto border border-slate-300 bg-white"
                style={{
                  width: "210mm",
                  height: "297mm",
                  overflow: "hidden",
                }}
              >
                <div className="absolute right-[12mm] top-[16mm] text-[28px] font-bold tracking-[0.12em] [text-orientation:upright] [writing-mode:vertical-rl]">
                  {titleText}
                </div>

                <div className="absolute right-[48mm] top-[42mm] text-[18px] leading-[1.9] [text-orientation:upright] [writing-mode:vertical-rl]">
                  私事
                </div>

                <div className="absolute right-[72mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                  一身上の都合により、
                </div>

                <div className="absolute right-[88mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                  <span
                    className={`inline-block whitespace-nowrap ${
                      formattedRetirementDate
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {formattedRetirementDate || "〇年〇月〇日"}
                  </span>
                  をもって、退職いたします。
                </div>

                <div className="absolute right-[120mm] top-[185mm] whitespace-nowrap text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                  <span className="text-slate-900">{formattedSubmitDate}</span>
                </div>

                <div className="absolute right-[132mm] top-[190mm] text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                  {form.department || "所属部署"}
                </div>

                <div className="absolute right-[132mm] top-[225mm] text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                  {form.name || "氏名"}
                </div>

                <div className="absolute left-[46mm] top-[75mm] text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                  {form.companyName || "株式会社〇〇〇"}
                </div>

                <div className="absolute left-[36mm] top-[75mm] text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                  {`代表取締役 ${form.representativeName || "代表者 太郎"} 殿`}
                </div>
              </div>
            </div>
          </div>

          <div className="no-print mb-8">
            <button
              onClick={handlePrint}
              disabled={hasError}
              className={`w-full rounded-2xl py-4 text-lg font-semibold shadow ${
                hasError
                  ? "cursor-not-allowed bg-gray-300 text-gray-500"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              退職届PDFを出力する
            </button>

            <div className="mt-2 text-right text-xs text-slate-400">
              ※印刷画面から印刷またはPDF保存を選択できます
            </div>
            <div className="mt-1 text-right text-xs text-slate-400">
              ※PDF出力・自分で提出する場合は無料です
            </div>
          </div>

          <div className="no-print border-t border-slate-200 pt-6">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-start">
                <div className="flex justify-center sm:justify-start">
                  <img
                    src="/images/taishoku-baasama/taishoku-baasama-half-guide.png"
                    alt=""
                    className="block h-32 w-auto object-contain sm:h-36"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    次の手続き
                  </h3>

                  <div className="mt-4 rounded-xl border border-amber-300 bg-white/70 px-4 py-3 text-xs leading-6 text-slate-700">
                    <div>
                      ※会社名・差出人名・所属部署名・料金情報を次ページへ引き継ぎます
                    </div>
                    <div className="mt-2 pl-4 font-semibold text-amber-800">
                      次ページで内容を訂正したい場合は、用意する「戻る」ボタンから戻ってください
                    </div>
                    <div className="mt-1 pl-4 text-slate-600">
                      ブラウザバックや更新は、表示や料金状態がずれる原因になります
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="mb-3 text-xl font-bold">
                    郵送で提出したい方へ
                  </h2>

                  <p className="mb-5 text-sm leading-7 text-slate-600">
                    直接渡すのが難しい場合は、宛名書き・送り状・返却物の整理まで進められます。
                  </p>

                  <div className="mb-5 rounded-xl border border-blue-300 bg-blue-50 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          郵送準備サポート
                        </div>
                        <div className="text-xs leading-6 text-slate-500">
                          宛名書き・送り状・私物送付・書類送付先の指定をまとめて準備できます。
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <div className="text-sm text-slate-500 line-through">
                          1,500円
                        </div>
                        <div className="text-xl font-bold text-blue-700">
                          今だけ無料公開中
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      ※このサービスは郵送手続きを補助するものです
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePostalSupport}
                    disabled={hasError}
                    className={`block w-full rounded-2xl py-4 text-center text-lg font-semibold shadow ${
                      hasError
                        ? "cursor-not-allowed bg-gray-300 text-gray-500"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    郵送準備へ進む
                  </button>
                </div>

                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm sm:p-6">
                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    退職エピソード投稿
                  </h3>

                  <p className="mb-4 text-sm leading-7 text-slate-700">
                    退職時のエピソードを投稿して郵送補助をする場合、無料期間終了後は
                    <span className="font-semibold text-orange-700">
                      {" "}
                      300円〜500円割引{" "}
                    </span>
                    です。
                  </p>

                  <div className="mb-4 rounded-xl border border-orange-300 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          郵送補助の割引対象
                        </div>
                        <div className="text-xs text-slate-500">
                          今だけ無料公開中
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <div className="text-sm text-slate-500 line-through">
                          1,500円
                        </div>
                        <div className="text-xl font-bold text-orange-700">
                          0円
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleEpisodePost}
                    disabled={hasError}
                    className={`w-full rounded-2xl py-4 text-center text-lg font-semibold shadow ${
                      hasError
                        ? "cursor-not-allowed bg-gray-300 text-gray-500"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    退職エピソードを投稿する
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      退職時の注意事項
                    </h3>
                    <p className="mb-4 text-sm leading-7 text-slate-700">
                      退職意思の伝え方、上司への相談、郵送時の注意点などを確認できます。
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/next-step"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        注意事項を確認する
                      </Link>

                      <a
                        href="https://guide.taishoku-tool.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        退職ガイドの記事を読む
                      </a>
                    </div>
                  </div>
                  <img
                    src="/images/taishoku-baasama/taishoku-baasama-half-think.png"
                    alt="注意事項を案内する退職ばあ様"
                    className="mx-auto block h-24 w-24 shrink-0 object-contain sm:mx-0 sm:h-28 sm:w-28"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-2 text-base font-bold text-slate-900">
                      退職後の生活費シミュレーション
                    </h3>
                    <p className="mb-4 text-sm leading-7 text-slate-700">
                      退職後の手元資金が何ヶ月持つか、家賃・生活費・収入見込みから概算できます。
                    </p>

                    <Link
                      href="/life-plan"
                      className="inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      生活費をシミュレーションする
                    </Link>
                  </div>
                  <img
                    src="/images/taishoku-baasama/taishoku-baasama-half-thumbsup.png"
                    alt="生活費確認を案内する退職ばあ様"
                    className="mx-auto block h-24 w-24 shrink-0 object-contain sm:mx-0 sm:h-28 sm:w-28"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-base font-bold text-slate-900">
                    退職エピソード集
                  </h3>
                  <p className="mb-4 text-sm leading-7 text-slate-700">
                    実際の退職体験談をまとめる予定です。
                  </p>

                  <div
                    aria-disabled="true"
                    className="inline-flex select-none items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  >
                    coming soon
                  </div>
                </div>
                <img
                  src="/images/taishoku-baasama/taishoku-baasama-half-present.png"
                  alt="退職エピソード集を案内する退職ばあ様"
                  className="mx-auto block h-24 w-24 shrink-0 object-contain sm:mx-0 sm:h-28 sm:w-28"
                />
              </div>
            </div>
          </div>

          <div className="no-print mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href="/feedback"
              className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-center font-medium text-blue-700 hover:bg-blue-100"
            >
              ご利用の感想を送る
            </a>

            <a
              href="/bug-report"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-center font-medium text-red-700 hover:bg-red-100"
            >
              不具合を報告する
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
