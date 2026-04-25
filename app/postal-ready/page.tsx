"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "retirement-form-v1";

export default function PostalReadyPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setData(JSON.parse(saved));
    }
  }, []);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const win = window.open("", "_blank");

    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>PDF出力</title>
          <style>
            body {
              font-family: serif;
              padding: 40px;
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  };

  // ✅ データなし対応
  if (!data) {
    return (
      <div className="p-10 text-center">
        <p className="mb-4">データが見つかりません。</p>
        <Link href="/" className="text-blue-600 underline">
          入力画面に戻る
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl">

        <h1 className="text-2xl font-bold mb-6">
          退職届の出力
        </h1>

        {/* PDFプレビュー */}
        <div
          ref={printRef}
          className="rounded-xl border border-slate-300 bg-white p-6 mb-6"
        >
          <p className="text-right">{data.date}</p>

          <p className="mt-10">
            {data.companyName} <br />
            {data.representativeName} 殿
          </p>

          <p className="mt-10 text-right">
            {data.address} <br />
            {data.name}
          </p>

          <p className="mt-10">拝啓</p>

          <p className="mt-6 leading-8">
            私事、{data.retirementDate}をもって退職いたします。
          </p>

          <p className="mt-6">以上</p>
        </div>

        {/* 注意 */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
          <p className="text-sm font-semibold text-red-700">
            必ず保存してください
          </p>
          <p className="mt-2 text-sm text-red-700 leading-7">
            このPDFは後から再表示できない可能性があります。<br />
            必ず「PDF保存」または印刷を行ってください。
          </p>
        </div>

        {/* メイン */}
        <button
          onClick={handlePrint}
          className="w-full rounded-xl bg-blue-600 px-4 py-4 text-white font-semibold mb-4"
        >
          PDFを保存する
        </button>

        {/* サブ */}
        <Link
          href="/letterpack"
          className="block w-full text-center rounded-xl border border-slate-300 px-4 py-4 text-slate-800 mb-4"
        >
          続けてレターパックを作る
        </Link>

        <Link
          href="/"
          className="block w-full text-center rounded-xl border border-slate-300 px-4 py-4 text-slate-500"
        >
          入力画面に戻る
        </Link>
      </div>
    </main>
  );
}