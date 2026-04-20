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
const POSTAL_HANDOFF_KEY = "postal-discount-handoff-v1";
const COUNT_KEY = "retirement-counted-v1";

const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

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

export default function RetirementDocumentToolMVP() {
  const [documentType, setDocumentType] = useState<DocumentType>("wish");

  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    department: "",
    companyName: "",
    companyAddress: "",
    representativeName: "",
    retirementDate: "",
  });

  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as {
        documentType?: DocumentType;
        form?: Partial<FormState>;
      };

      if (parsed.documentType === "wish" || parsed.documentType === "notice") {
        setDocumentType(parsed.documentType);
      }

      if (parsed.form) {
        setForm((prev) => ({
          ...prev,
          ...parsed.form,
        }));
      }
    } catch {
      // 壊れたデータは無視
    }
  }, []);

  useEffect(() => {
    const counted = sessionStorage.getItem(COUNT_KEY);
    if (counted) return;

    fetch("/api/count", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "view" }),
    }).catch(() => {
      // 計測失敗でも画面動作は継続
    });

    sessionStorage.setItem(COUNT_KEY, "1");
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        documentType,
        form,
      })
    );
  }, [documentType, form]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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

  const formattedDate = formatDate(form.retirementDate);

  const printRef = useRef<HTMLDivElement | null>(null);

  const titleText = documentType === "wish" ? "退職願" : "退職届";

  const handlePrint = async () => {
  if (!printRef.current) return;

  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if (!printWindow) {
    alert("印刷用ウィンドウを開けませんでした。ポップアップブロックを確認してください。");
    return;
  }

  fetch("/api/count", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "pdf" }),
  }).catch(() => {
    // 計測失敗でも出力は続行
  });

    const html = printRef.current.outerHTML;

    const headHtml = Array.from(
      document.head.querySelectorAll("style, link[rel='stylesheet']")
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
            })
        )
      );
    };

    const waitForFonts = async () => {
      try {
        const fontSet = (printWindow.document as Document & {
          fonts?: { ready?: Promise<unknown> };
        }).fonts;

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

  const errors = {
    name: !form.name,
    department: !form.department,
    companyName: !form.companyName,
    representativeName: !form.representativeName,
    retirementDate: !form.retirementDate,
  };

  const hasError = Object.values(errors).some(Boolean);

  const missingItems = [
    errors.name ? "氏名" : null,
    errors.department ? "所属部署名" : null,
    errors.companyName ? "会社名" : null,
    errors.representativeName ? "代表取締役氏名" : null,
    errors.retirementDate ? "退職日" : null,
  ].filter(Boolean);

  const explanationText =
    documentType === "wish"
      ? "退職願は、退職について会社にお願いする文書です。撤回や調整の余地がある前提で使われることがあります。"
      : "退職届は、退職の意思を届け出る文書です。社内手続きの最終提出書類として扱われることがあります。";

  const resetSavedData = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(POSTAL_HANDOFF_KEY);

    setDocumentType("wish");
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

  const buildHandoffData = () => {
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
      basePrice: 0,
      discountMin: 0,
      discountMax: 0,
      discountedPriceMin: 0,
      discountedPriceMax: 0,
      episodePosted: false,
      canGoBack: true,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleEpisodePost = () => {
    sessionStorage.setItem(
      POSTAL_HANDOFF_KEY,
      JSON.stringify(buildHandoffData())
    );
    window.location.href = "/episode";
  };

  const handlePostalSupport = () => {
    fetch("/api/count", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "postal" }),
    }).catch(() => {
      // 計測失敗でも遷移は続行
    });

    sessionStorage.setItem(
      POSTAL_HANDOFF_KEY,
      JSON.stringify(buildHandoffData())
    );
    window.location.href = "/postal";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="no-print rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            退職願・退職届を簡単に作成
          </h1>
          <p className="mb-2 text-lg font-semibold text-blue-700">
            退職は「意思表示」で成立します。
          </p>
          <p className="mb-4 text-base text-slate-700">
            まずは書面で意思を伝えましょう。
          </p>
          <p className="text-base leading-7 text-slate-600 md:text-lg">
            入力するだけで、退職願・退職届をすぐに作成できます。
            印刷やPDF保存にも対応しています。
          </p>
          <div className="mt-6">
            <span className="inline-block text-sm text-slate-500">
              ↓ 下のフォームから入力を開始できます
            </span>
            <div className="mt-2 text-xs text-slate-400">
              ※入力内容はこのタブ内で一時保持されます。
            </div>
          </div>
        </section>

        <section className="no-print rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="mb-5 text-2xl font-bold">文書タイプ</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setDocumentType("wish")}
              className={`rounded-2xl border p-5 text-left transition ${
                documentType === "wish"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <div className="mb-2 text-xl font-semibold">退職願</div>
              <div
                className={`leading-7 ${
                  documentType === "wish" ? "text-slate-200" : "text-slate-600"
                }`}
              >
                会社に対して退職を願い出る文書。社内調整前や相談段階で使われることがあります。
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDocumentType("notice")}
              className={`rounded-2xl border p-5 text-left transition ${
                documentType === "notice"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <div className="mb-2 text-xl font-semibold">退職届</div>
              <div
                className={`leading-7 ${
                  documentType === "notice" ? "text-slate-200" : "text-slate-600"
                }`}
              >
                退職の意思を正式に届け出る文書。最終提出書類として扱われることがあります。
              </div>
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-100 p-4 leading-7 text-slate-700">
            {explanationText}
          </div>
        </section>

        {hasError && (
          <section className="no-print rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">
            <div className="mb-2 font-semibold">
              未入力項目があります。印刷・PDF保存はできません。
            </div>
            <div className="text-sm leading-7">
              未入力: {missingItems.join("、")}
            </div>
          </section>
        )}

        <section className="no-print grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">入力フォーム</h2>
              <button
                type="button"
                onClick={resetSavedData}
                className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
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
                    errors.name
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">氏名は必須です</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">所属部署名</label>
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="例：営業部"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    errors.department
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {errors.department && (
                  <p className="mt-1 text-sm text-red-500">所属部署名は必須です</p>
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
                    errors.companyName
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-500">会社名は必須です</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">代表取締役氏名</label>
                <input
                  type="text"
                  name="representativeName"
                  value={form.representativeName}
                  onChange={handleChange}
                  placeholder="例：代表者 太郎"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                    errors.representativeName
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {errors.representativeName && (
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
                    errors.retirementDate
                      ? "border-red-300 focus:ring-red-200"
                      : "border-slate-300 focus:ring-slate-300"
                  }`}
                />
                {errors.retirementDate && (
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

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-bold">確認画面</h2>

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
                <div className="font-medium">{form.department || "未入力"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">会社名</div>
                <div className="font-medium">{form.companyName || "未入力"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">代表取締役氏名</div>
                <div className="font-medium">
                  {form.representativeName || "未入力"}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">退職日</div>
                <div className="font-medium">{form.retirementDate || "未入力"}</div>
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
                {hasError
                  ? "未入力項目があります。すべて入力するまで印刷・PDF保存はできません。"
                  : "出力可能な状態です。"}
              </div>
            </div>
          </div>
        </section>

        <section className="print-section rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="no-print mb-6">
            <h2 className="mb-2 text-2xl font-bold">{titleText}プレビュー</h2>
            <p className="text-sm text-slate-600">
              内容を確認したうえで、PDFを出力してください。
            </p>
          </div>

          <div className="mb-8 overflow-x-auto">
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

              {documentType === "wish" ? (
                <>
                  <div className="absolute right-[78mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                    一身上の都合により、
                  </div>

                  <div className="absolute right-[88mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                    <span
                      className={`inline-block whitespace-nowrap ${
                        formattedDate ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {formattedDate || "〇年〇月〇日"}
                    </span>
                    をもって、退職いたしたく、
                  </div>

                  <div className="absolute right-[98mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                    ここにお願い申し上げます。
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute right-[72mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                    一身上の都合により、
                  </div>

                  <div className="absolute right-[88mm] top-[28mm] whitespace-pre-line text-[18px] leading-[2.15] [text-orientation:upright] [writing-mode:vertical-rl]">
                    <span
                      className={`inline-block whitespace-nowrap ${
                        formattedDate ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {formattedDate || "〇年〇月〇日"}
                    </span>
                    をもって、退職いたします。
                  </div>
                </>
              )}

              <div className="absolute right-[120mm] top-[185mm] whitespace-nowrap text-[17px] leading-[2.2] [text-orientation:upright] [writing-mode:vertical-rl]">
                <span className={formattedDate ? "text-slate-900" : "text-red-500"}>
                  {formattedDate || "日付未入力"}
                </span>
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
              PDFを出力する
            </button>

            <div className="mt-2 text-right text-xs text-slate-400">
              ※印刷画面から印刷またはPDF保存を選択できます
            </div>
            <div className="mt-1 text-right text-xs text-slate-400">
              ※PDF出力・自分で提出する場合は無料です
            </div>
          </div>

          <div className="no-print border-t border-slate-200 pt-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <h3 className="text-lg font-bold text-slate-900">次の手続き</h3>

                <div className="max-w-xl rounded-xl border border-amber-300 bg-white/70 px-4 py-3 text-xs leading-6 text-slate-700">
                  <div>
                    ※会社名・差出人名・所属部署名・料金情報を次ページへ引き継ぎます
                  </div>
                  <div className="mt-1 font-semibold text-amber-800">
                    ※次ページで内容を訂正したい場合は、用意する「戻る」ボタンから戻ってください
                  </div>
                  <div className="mt-1 text-slate-600">
                    ※ブラウザバックや更新は、表示や料金状態がずれる原因になります
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="mb-3 text-2xl font-bold">
                  会社とのやり取りを最小限にしたい方へ
                </h2>

                <p className="mb-6 leading-7 text-slate-600">
                  直接のやり取りが難しい場合でも、郵送で提出することができます。
                </p>

                <div className="mb-6 rounded-xl border border-blue-300 bg-blue-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        郵送セット
                      </div>
                      <div className="text-xs text-slate-500">
                        宛名書き・送り状・私物送付・書類送付先の指定が自動生成できます。
                      </div>
                    </div>

                    <div className="shrink-0 text-xl font-bold text-blue-700">
                      1,500円
                    </div>
                     <div className="text-xl font-bold text-blue-700">5/9まで無料</div>
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
                  このまま郵送準備をする
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-6">
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  退職エピソード投稿
                </h3>

                <p className="mb-4 leading-7 text-slate-700">
                  退職時のエピソードを投稿して郵送補助をする場合、無料期間終了後は
                 <span className="font-semibold text-orange-700"> 300円〜500円割引 </span>
                 です。
                </p>

                <div className="mb-4 rounded-xl border border-orange-300 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        郵送補助の割引対象
                      </div>
                      <div className="text-xs text-slate-500">
                        5/9までは、郵送補助 0円
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
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

          <div className="no-print grid gap-4 pt-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-2 text-base font-bold text-slate-900">
                退職後の確認
              </h3>
              <p className="mb-4 text-sm leading-7 text-slate-700">
                会社へ返却する書類や持ち物、回収しておきたい資料の確認はこちらから進めます。
              </p>

              <Link
                href="/after-resignation"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                退職後のチェックページへ進む
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
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
          </div>
          <div className="no-print mt-6 grid gap-3 sm:grid-cols-2">
            <a
              href="/feedback"
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-center font-medium text-gray-800 hover:bg-slate-50"
            >
              改善要望を送る
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