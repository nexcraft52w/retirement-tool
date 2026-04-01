"use client";

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

const STORAGE_KEY = "retirement-document-form-v1";

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
    const saved = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(
      STORAGE_KEY,
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

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) return;

    const html = printRef.current.outerHTML;

    const headHtml = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
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
              background: #fff;
            }

            body {
              width: 210mm;
              height: 297mm;
              overflow: hidden;
            }

            .print-root {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #fff;
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
            }

            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="print-root">${html}</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 300);
    };
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

  const titleText = documentType === "wish" ? "退職願" : "退職届";

  const explanationText =
    documentType === "wish"
      ? "退職願は、退職について会社にお願いする文書です。撤回や調整の余地がある前提で使われることがあります。"
      : "退職届は、退職の意思を届け出る文書です。社内手続きの最終提出書類として扱われることがあります。";

  const resetSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
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

    return (
    <>
          <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200 no-print">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm mb-4">
            MVPたたき台
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            文書作成・送付支援ツール
          </h1>
          <p className="text-base md:text-lg text-slate-600 max-w-3xl leading-7">
            まずは最小構成で作る。先に「入力できる」「確認できる」「印刷できる」状態を作る。
          </p>
        </section>

        <section className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200 no-print">
          <h2 className="text-2xl font-bold mb-5">文書タイプ</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDocumentType("wish")}
              className={`rounded-2xl border p-5 text-left transition ${
                documentType === "wish"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              <div className="text-xl font-semibold mb-2">退職願</div>
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
              <div className="text-xl font-semibold mb-2">退職届</div>
              <div
                className={`leading-7 ${
                  documentType === "notice"
                    ? "text-slate-200"
                    : "text-slate-600"
                }`}
              >
                退職の意思を正式に届け出る文書。最終提出書類として扱われることがあります。
              </div>
            </button>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-slate-700 leading-7">
            {explanationText}
          </div>
        </section>

        {hasError && (
          <section className="no-print bg-red-50 border border-red-200 text-red-700 rounded-3xl p-5 shadow-sm">
            <div className="font-semibold mb-2">
              未入力項目があります。印刷・PDF保存はできません。
            </div>
            <div className="text-sm leading-7">
              未入力: {missingItems.join("、")}
            </div>
          </section>
        )}

        <section className="grid md:grid-cols-2 gap-6 no-print">
          <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-2xl font-bold">入力フォーム</h2>
              <button
                type="button"
                onClick={resetSavedData}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                入力をリセット
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">氏名</label>
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
                  <p className="text-red-500 text-sm mt-1">氏名は必須です</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  住所（郵送用）
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="例：東京都〇〇区〇〇"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">所属部署名</label>
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
                  <p className="text-red-500 text-sm mt-1">所属部署名は必須です</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">会社名</label>
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
                  <p className="text-red-500 text-sm mt-1">会社名は必須です</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  会社住所（郵送用）
                </label>
                <textarea
                  name="companyAddress"
                  value={form.companyAddress}
                  onChange={handleChange}
                  placeholder="例：東京都〇〇区〇〇"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  代表取締役氏名
                </label>
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
                  <p className="text-red-500 text-sm mt-1">
                    代表取締役氏名は必須です
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">退職日</label>
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
                  <p className="text-red-500 text-sm mt-1">退職日は必須です</p>
                )}
                {!errors.retirementDate && (
                  <p className="text-slate-500 text-sm mt-1">
                    今日以降の日付のみ選択できます
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-8 border border-slate-200">
            <h2 className="text-2xl font-bold mb-6">確認画面</h2>

            <div className="space-y-4 text-slate-700 leading-7">
              <div>
                <div className="text-sm text-slate-500">文書タイプ</div>
                <div className="font-medium">{titleText}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">氏名</div>
                <div className="font-medium">{form.name || "未入力"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">住所（郵送用）</div>
                <div className="font-medium whitespace-pre-line">
                  {form.address || "未入力"}
                </div>
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
                <div className="text-sm text-slate-500">会社住所（郵送用）</div>
                <div className="font-medium whitespace-pre-line">
                  {form.companyAddress || "未入力"}
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

            <div className="mt-8 space-y-3">
              <div
                className={`rounded-2xl p-4 border ${
                  hasError
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                {hasError
                  ? "未入力項目があります。すべて入力するまで印刷・PDF保存はできません。"
                  : "出力可能な状態です。"}
              </div>

              <div className="rounded-2xl p-4 bg-slate-100 text-slate-700">
                住所は紙面には出さず、郵送時の情報として保持します。入力内容はブラウザに自動保存されます。
              </div>
            </div>
          </div>
        </section>

        <section className="print-section bg-white rounded-3xl shadow-sm p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-6 no-print">
            <h2 className="text-2xl font-bold">{titleText}プレビュー</h2>
            <button
              onClick={handlePrint}
              disabled={hasError}
              className={`px-6 py-3 rounded-xl text-white ${
                hasError
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              印刷する（PDF保存可）
            </button>
          </div>

          <div className="overflow-x-auto">
            <div
              ref={printRef}
              className="mx-auto bg-white border border-slate-300 relative retirement-sheet"
              style={{
                width: "210mm",
                height: "297mm",
                overflow: "hidden",
              }}
            >
              <div className="absolute top-[16mm] right-[12mm] text-[28px] font-bold tracking-[0.12em] [writing-mode:vertical-rl] [text-orientation:upright]">
                {titleText}
              </div>

              <div className="absolute top-[42mm] right-[48mm] text-[18px] leading-[1.9] [writing-mode:vertical-rl] [text-orientation:upright]">
                私事
              </div>

              {documentType === "wish" ? (
                <>
                  <div className="absolute top-[28mm] right-[78mm] text-[18px] leading-[2.15] whitespace-pre-line [writing-mode:vertical-rl] [text-orientation:upright]">
                    一身上の都合により、
                  </div>

                  <div className="absolute top-[28mm] right-[88mm] text-[18px] leading-[2.15] whitespace-pre-line [writing-mode:vertical-rl] [text-orientation:upright]">
                    <span
                      className={`inline-block whitespace-nowrap ${
                        formattedDate ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {formattedDate || "〇年〇月〇日"}
                    </span>
                    をもって、退職いたしたく、
                  </div>

                  <div className="absolute top-[28mm] right-[98mm] text-[18px] leading-[2.15] whitespace-pre-line [writing-mode:vertical-rl] [text-orientation:upright]">
                    ここにお願い申し上げます。
                  </div>
                </>
              ) : (
                <>
                  <div className="absolute top-[28mm] right-[72mm] text-[18px] leading-[2.15] whitespace-pre-line [writing-mode:vertical-rl] [text-orientation:upright]">
                    一身上の都合により、
                  </div>

                  <div className="absolute top-[28mm] right-[88mm] text-[18px] leading-[2.15] whitespace-pre-line [writing-mode:vertical-rl] [text-orientation:upright]">
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

              <div className="absolute top-[185mm] right-[120mm] text-[17px] leading-[2.2] whitespace-nowrap [writing-mode:vertical-rl] [text-orientation:upright]">
                <span
                  className={formattedDate ? "text-slate-900" : "text-red-500"}
                >
                  {formattedDate || "日付未入力"}
                </span>
              </div>

              <div className="absolute top-[190mm] right-[132mm] text-[17px] leading-[2.2] [writing-mode:vertical-rl] [text-orientation:upright]">
                {form.department || "所属部署"}
              </div>

              <div className="absolute top-[225mm] right-[132mm] text-[17px] leading-[2.2] [writing-mode:vertical-rl] [text-orientation:upright]">
                {form.name || "氏名"}
              </div>

              <div className="absolute top-[75mm] left-[46mm] text-[17px] leading-[2.2] [writing-mode:vertical-rl] [text-orientation:upright]">
                {form.companyName || "株式会社〇〇〇"}
              </div>

              <div className="absolute top-[75mm] left-[36mm] text-[17px] leading-[2.2] [writing-mode:vertical-rl] [text-orientation:upright]">
                {`代表取締役 ${form.representativeName || "代表者 太郎"} 殿`}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </>
);
}