"use client";

import Link from "next/link";
import type React from "react";
import { useMemo, useState } from "react";

type FormState = {
  savings: string;
  rent: string;
  livingCost: string;
  foodCost: string;
  miscCost: string;
  benefitDaily: string;
  benefitDays: string;
};

type MonthRow = {
  month: number;
  income: number;
  expense: number;
  balance: number;
};

type CtaLink = {
  label: string;
  href: string;
  disabled?: boolean;
};

const HEADER_BANNER_SRC =
  "/images/taishoku-baasama/taishoku-tool-header-banner.png";

const BAASAMA_IMAGES = {
  think: "/images/taishoku-baasama/taishoku-baasama-half-think.png",
  guide: "/images/taishoku-baasama/taishoku-baasama-half-guide.png",
  point: "/images/taishoku-baasama/taishoku-baasama-half-point.png",
  thumbsup: "/images/taishoku-baasama/taishoku-baasama-half-thumbsup.png",
};

const EXTERNAL_LINKS = {
  timee: "https://timee.co.jp/",
  indeed: "https://jp.indeed.com/",
  resort: "https://www.rizoba.com/",
  moving: "https://hikkoshizamurai.jp/",
};

function toNumber(value: string) {
  const n = Number(value.replace(/,/g, "").replace(/[^\d]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value));
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export default function LifePlanPage() {
  const [form, setForm] = useState<FormState>({
    savings: "500000",
    rent: "70000",
    livingCost: "30000",
    foodCost: "25000",
    miscCost: "20000",
    benefitDaily: "6400",
    benefitDays: "90",
  });

  const values = useMemo(() => {
    const savings = toNumber(form.savings);
    const rent = toNumber(form.rent);
    const livingCost = toNumber(form.livingCost);
    const foodCost = toNumber(form.foodCost);
    const miscCost = toNumber(form.miscCost);
    const benefitDaily = toNumber(form.benefitDaily);
    const benefitDays = toNumber(form.benefitDays);

    const monthlyExpense = rent + livingCost + foodCost + miscCost;
    const benefitMonths = Math.ceil(benefitDays / 28);

    return {
      savings,
      rent,
      livingCost,
      foodCost,
      miscCost,
      benefitDaily,
      benefitDays,
      monthlyExpense,
      benefitMonths,
    };
  }, [form]);

  const simulation = useMemo(() => {
    const rows: MonthRow[] = [];
    const maxMonths = 12;

    let balance = values.savings;
    let remainingBenefitDays = values.benefitDays;
    let monthsLeft: number | null = null;

    rows.push({
      month: 0,
      income: 0,
      expense: 0,
      balance,
    });

    for (let month = 1; month <= maxMonths; month++) {
      const paidDays = Math.min(28, remainingBenefitDays);
      const income = paidDays * values.benefitDaily;
      remainingBenefitDays -= paidDays;

      const expense = values.monthlyExpense;
      balance = balance + income - expense;

      rows.push({
        month,
        income,
        expense,
        balance,
      });

      if (balance <= 0 && monthsLeft === null) {
        monthsLeft = month;
      }
    }

    let zeroMonthDateText = "12か月以内には尽きません";

    if (values.savings <= 0) {
      zeroMonthDateText = "すでに0円以下です";
      monthsLeft = 0;
    } else if (monthsLeft !== null) {
      const now = new Date();
      const zeroDate = new Date(
        now.getFullYear(),
        now.getMonth() + monthsLeft,
        1
      );
      zeroMonthDateText = `${formatMonthLabel(zeroDate)}ごろ`;
    }

    const firstMonthIncome = rows[1]?.income ?? 0;
    const monthlyBalanceAtStart = firstMonthIncome - values.monthlyExpense;

    return {
      rows,
      monthsLeft,
      zeroMonthDateText,
      monthlyBalanceAtStart,
    };
  }, [values]);

  const visibleRows = simulation.rows;
  const graphRows = visibleRows.slice(0, 12);
  const maxBalance = Math.max(
    ...graphRows.map((row) => Math.max(row.balance, 0)),
    1
  );

  const ctaLevel =
    simulation.monthsLeft === null
      ? "safe"
      : simulation.monthsLeft <= 3
      ? "danger"
      : simulation.monthsLeft <= 6
      ? "warning"
      : "safe";

  const ctaConfig = {
    safe: {
      wrap: "border-blue-200 bg-blue-50",
      title: "text-blue-950",
      body: "text-blue-950/80",
      note: "text-blue-950/70",
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary:
        "border-blue-300 bg-white text-blue-700 hover:bg-blue-100",
      heading: "余裕があるうちに、収入と固定費も見ておきましょう",
      text:
        "退職後は、貯金があるうちに選択肢を見ておく方が安全です。日払い・求人・寮付きの仕事を、必要なときに探せる状態にしておきましょう。",
      links: [
        {
          label: "日払い・単発バイトを探す",
          href: EXTERNAL_LINKS.timee,
        },
        {
          label: "求人を探す",
          href: EXTERNAL_LINKS.indeed,
        },
        {
          label: "寮付きバイトを探す",
          href: EXTERNAL_LINKS.resort,
        },
      ] as CtaLink[],
    },
    warning: {
      wrap: "border-amber-200 bg-amber-50",
      title: "text-amber-950",
      body: "text-amber-950/80",
      note: "text-amber-950/70",
      primary: "bg-amber-500 text-white hover:bg-amber-600",
      secondary:
        "border-amber-300 bg-white text-amber-700 hover:bg-amber-100",
      heading: `このままだと資金は${simulation.monthsLeft ?? ""}か月で尽きます`,
      text:
        "失業保険が終わる前に、収入を増やす方法と、住居費を下げる方法を両方見ておくのが無難です。",
      links: [
        {
          label: "日払い・単発バイトを探す",
          href: EXTERNAL_LINKS.timee,
        },
        {
          label: "求人を探す",
          href: EXTERNAL_LINKS.indeed,
        },
        {
          label: "寮付きバイトを探す",
          href: EXTERNAL_LINKS.resort,
        },
      ] as CtaLink[],
    },
    danger: {
      wrap: "border-rose-200 bg-rose-50",
      title: "text-rose-950",
      body: "text-rose-950/80",
      note: "text-rose-950/70",
      primary: "bg-rose-600 text-white hover:bg-rose-700",
      secondary:
        "border-rose-300 bg-white text-rose-700 hover:bg-rose-100",
      heading: `資金は${simulation.monthsLeft ?? ""}か月以内に尽きます`,
      text:
        "すぐに収入を確保できる仕事を探す段階です。日払い・求人・寮付きの仕事を見て、資金切れまでの時間を延ばしてください。",
      links: [
        {
          label: "日払い・単発バイトを探す",
          href: EXTERNAL_LINKS.timee,
        },
        {
          label: "求人を探す",
          href: EXTERNAL_LINKS.indeed,
        },
        {
          label: "寮付きバイトを探す",
          href: EXTERNAL_LINKS.resort,
        },
      ] as CtaLink[],
    },
  }[ctaLevel];

  const monthsLeftValueClass =
    simulation.monthsLeft !== null && simulation.monthsLeft <= 3
      ? "text-rose-600"
      : simulation.monthsLeft !== null && simulation.monthsLeft <= 6
      ? "text-amber-600"
      : "text-slate-900";

  const handleChange =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      setForm((prev) => ({
        ...prev,
        [key]: raw,
      }));
    };

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <Link href="/" aria-label="退職ツールのトップへ" className="block">
            <img
              src={HEADER_BANNER_SRC}
              alt="退職ツール"
              className="h-auto w-full rounded-2xl shadow-sm"
            />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="grid grid-cols-[1fr_118px] gap-0 sm:grid-cols-[1fr_180px] md:grid-cols-[1fr_220px]">
            <div className="p-5 pr-2 sm:p-6 sm:pr-4">
              <p className="text-xs font-bold text-amber-700 sm:text-sm">
                退職ばあ様の生活費チェック
              </p>
              <h1 className="mt-2 text-xl font-bold leading-snug sm:text-3xl">
                退職後の資金、何ヶ月で尽きるか簡易計算
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                今ある貯金と毎月の支出・収入から、生活資金がどのくらい持つかを簡易で確認できます。
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                状況が変わったタイミングで、再計算することをおすすめします。
              </p>
            </div>

            <div className="relative min-h-[230px] bg-amber-50 sm:min-h-[250px] md:min-h-0">
              <img
                src={BAASAMA_IMAGES.think}
                alt="退職ばあ様"
                className="absolute bottom-0 right-0 max-h-[190px] w-auto sm:right-2 sm:max-h-[220px]"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold">入力</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    ざっくりで構いません。まずは毎月出ていく金額を入れてください。
                  </p>
                </div>
                <img
                  src={BAASAMA_IMAGES.guide}
                  alt=""
                  className="h-20 w-auto shrink-0"
                />
              </div>

              <div className="mt-5 space-y-4">
                <InputRow
                  label="現在の貯金残高"
                  value={form.savings}
                  onChange={handleChange("savings")}
                  placeholder="500000"
                />

                <InputRow
                  label="家賃"
                  value={form.rent}
                  onChange={handleChange("rent")}
                  placeholder="70000"
                />

                <InputRow
                  label="その他固定費（携帯・光熱費など）"
                  value={form.livingCost}
                  onChange={handleChange("livingCost")}
                  placeholder="30000"
                />

                <InputRow
                  label="月の食費"
                  value={form.foodCost}
                  onChange={handleChange("foodCost")}
                  placeholder="25000"
                />

                <InputRow
                  label="月のその他支出"
                  value={form.miscCost}
                  onChange={handleChange("miscCost")}
                  placeholder="20000"
                />
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <h3 className="text-base font-bold">失業保険</h3>

                <div className="mt-4 space-y-4">
                  <InputRow
                    label="日額"
                    value={form.benefitDaily}
                    onChange={handleChange("benefitDaily")}
                    placeholder="6400"
                  />

                  <InputRow
                    label="支給日数"
                    value={form.benefitDays}
                    onChange={handleChange("benefitDays")}
                    placeholder="90"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <SummaryRow label="家賃" value={`${formatYen(values.rent)}円`} />
                <SummaryRow
                  label="その他固定費"
                  value={`${formatYen(values.livingCost)}円`}
                />
                <SummaryRow
                  label="月の食費"
                  value={`${formatYen(values.foodCost)}円`}
                />
                <SummaryRow
                  label="月のその他支出"
                  value={`${formatYen(values.miscCost)}円`}
                />

                <div className="mt-2 border-t border-slate-200 pt-3">
                  <SummaryRow
                    label="月の支出合計"
                    value={`${formatYen(values.monthlyExpense)}円`}
                    strong
                  />
                  <SummaryRow
                    label="失業保険の日額"
                    value={`${formatYen(values.benefitDaily)}円`}
                    strong
                  />
                  <SummaryRow
                    label="支給日数"
                    value={`${formatYen(values.benefitDays)}日`}
                    strong
                  />
                  <SummaryRow
                    label="失業保険の終了目安"
                    value={`約${values.benefitMonths}か月`}
                    strong
                  />

                  <div className="mt-2 border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span>初月の概算収支</span>
                      <span
                        className={`font-bold ${
                          simulation.monthlyBalanceAtStart >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {simulation.monthlyBalanceAtStart >= 0 ? "+" : ""}
                        {formatYen(simulation.monthlyBalanceAtStart)}円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">月別の簡易収支表</h2>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-3 py-2 font-medium">月</th>
                      <th className="px-3 py-2 font-medium">収入</th>
                      <th className="px-3 py-2 font-medium">支出</th>
                      <th className="px-3 py-2 font-medium">月末残高</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.month} className="border-b border-slate-100">
                        <td className="px-3 py-2">{row.month}か月後</td>
                        <td className="px-3 py-2">
                          {row.month === 0 ? "-" : `${formatYen(row.income)}円`}
                        </td>
                        <td className="px-3 py-2">
                          {row.month === 0 ? "-" : `${formatYen(row.expense)}円`}
                        </td>
                        <td
                          className={`px-3 py-2 font-semibold ${
                            row.balance <= 0 ? "text-rose-600" : ""
                          }`}
                        >
                          {formatYen(row.balance)}円
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">シミュレーション結果</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ResultCard
                  title="資金が持つ目安"
                  value={
                    simulation.monthsLeft !== null
                      ? `${simulation.monthsLeft}か月`
                      : "12か月超"
                  }
                  valueClassName={monthsLeftValueClass}
                  sub="現在の条件での簡易計算"
                />
                <ResultCard
                  title="資金が尽きる時期"
                  value={simulation.zeroMonthDateText}
                  sub="12か月間の目安です"
                />
              </div>

              <div className="mt-4 rounded-xl bg-amber-50 p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={BAASAMA_IMAGES.point}
                    alt=""
                    className="h-24 w-auto shrink-0 sm:h-28"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">見方</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      このページは、毎月の支出がほぼ一定で、失業保険は入力した日額と支給日数の範囲で受け取る前提の、
                      12か月間の簡易シミュレーションです。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${ctaConfig.wrap}`}>
              <h2 className={`text-lg font-bold ${ctaConfig.title}`}>
                {ctaConfig.heading}
              </h2>
              <p className={`mt-3 text-sm leading-6 ${ctaConfig.body}`}>
                {ctaConfig.text}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {ctaConfig.links.map((link, index) => (
                  <CtaButton
                    key={link.label}
                    link={link}
                    className={index === 0 ? ctaConfig.primary : ctaConfig.secondary}
                    isPrimary={index === 0}
                  />
                ))}
              </div>

              <p className={`mt-3 text-xs ${ctaConfig.note}`}>
                ※外部サイトへ移動します。退職ツールとの提携リンクではありません。
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">残高の推移</h2>

              <div className="mt-5 space-y-3">
                {graphRows.map((row) => {
                  const width = `${Math.max(
                    (Math.max(row.balance, 0) / maxBalance) * 100,
                    row.balance > 0 ? 6 : 0
                  )}%`;
                  const isMinus = row.balance <= 0;

                  return (
                    <div key={row.month}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{row.month}か月後</span>
                        <span
                          className={
                            isMinus
                              ? "font-semibold text-rose-600"
                              : "font-semibold"
                          }
                        >
                          {formatYen(row.balance)}円
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            isMinus ? "bg-rose-400" : "bg-slate-800"
                          }`}
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                ※ 表示は最大12か月分です。
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
              <div className="grid gap-0 sm:grid-cols-[1fr_140px]">
                <div className="p-6">
                  <h2 className="text-lg font-bold text-slate-900">
                    家賃が重いなら、引越しも候補です
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    実家に戻る、家賃の安い地域へ移るなど、固定費を下げる選択肢もあります。
                    すぐに決める必要はありませんが、引越し費用だけでも確認しておくと判断しやすくなります。
                  </p>

                  <div className="mt-5">
                    <CtaButton
                      link={{
                        label: "引越し費用を見積もる",
                        href: EXTERNAL_LINKS.moving,
                      }}
                      className="bg-slate-900 text-white hover:bg-slate-800"
                      isFullWidth
                      isPrimary
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    ※外部サイトへ移動します。退職ツールとの提携リンクではありません。
                  </p>
                </div>

                <div className="relative min-h-[150px] bg-amber-50">
                  <img
                    src={BAASAMA_IMAGES.thumbsup}
                    alt="退職ばあ様"
                    className="absolute bottom-0 right-4 max-h-[150px] w-auto sm:right-0 sm:max-h-[170px]"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base outline-none transition focus:border-amber-500"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          {label === "支給日数" ? "日" : "円"}
        </span>
      </div>
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span>{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}

function ResultCard({
  title,
  value,
  sub,
  valueClassName,
}: {
  title: string;
  value: string;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p
        className={`mt-2 text-2xl font-bold sm:text-3xl ${
          valueClassName ?? "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function CtaButton({
  link,
  className,
  isPrimary = false,
  isFullWidth = false,
}: {
  link: CtaLink;
  className: string;
  isPrimary?: boolean;
  isFullWidth?: boolean;
}) {
  const baseClass = `inline-flex items-center justify-center rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${
    isPrimary ? "" : "border"
  } ${isFullWidth ? "w-full" : ""}`;

  if (link.disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} cursor-not-allowed opacity-70 ${className}`}
      >
        {link.label}
      </button>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseClass} ${className}`}
    >
      {link.label}
    </a>
  );
}
