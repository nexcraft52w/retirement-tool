"use client";

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

const AFFILIATE_LINKS = {
  fullcast: "#", // 承認後：フルキャストのA8広告リンクに差し替え
  sumijob: "#", // 承認後：スミジョブのA8広告リンクに差し替え
  moving: "#", // 承認後：引越し侍のA8広告リンクに差し替え
};

const AFFILIATE_READY = {
  fullcast: false,
  sumijob: false,
  moving: false,
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
      title: "text-blue-900",
      body: "text-blue-900/80",
      note: "text-blue-900/70",
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary:
        "border-blue-300 bg-white text-blue-700 hover:bg-blue-100",
      heading: "収入と固定費の見直しも検討しておきましょう",
      text:
        "余裕があるうちから、日払い・単発バイト、寮付き求人、家賃を下げる選択肢を確認しておくと安心です。",
      links: [
        {
          label: "日払い・単発バイトを見る",
          href: AFFILIATE_LINKS.fullcast,
          disabled: !AFFILIATE_READY.fullcast,
        },
        {
          label: "寮付き求人を見る",
          href: AFFILIATE_LINKS.sumijob,
          disabled: !AFFILIATE_READY.sumijob,
        },
        {
          label: "引越し料金を比較する",
          href: AFFILIATE_LINKS.moving,
          disabled: !AFFILIATE_READY.moving,
        },
      ] as CtaLink[],
    },
    warning: {
      wrap: "border-amber-200 bg-amber-50",
      title: "text-amber-900",
      body: "text-amber-900/80",
      note: "text-amber-900/70",
      primary: "bg-amber-500 text-white hover:bg-amber-600",
      secondary:
        "border-amber-300 bg-white text-amber-700 hover:bg-amber-100",
      heading: `このままだと資金は${simulation.monthsLeft ?? ""}か月で尽きます`,
      text:
        "失業保険の終了前から、収入を増やす方法と、家賃など固定費を下げる方法を両方見ておくのが安全です。",
      links: [
        {
          label: "日払いで探す",
          href: AFFILIATE_LINKS.fullcast,
          disabled: !AFFILIATE_READY.fullcast,
        },
        {
          label: "寮付き求人を見る",
          href: AFFILIATE_LINKS.sumijob,
          disabled: !AFFILIATE_READY.sumijob,
        },
        {
          label: "引越し料金を比較する",
          href: AFFILIATE_LINKS.moving,
          disabled: !AFFILIATE_READY.moving,
        },
      ] as CtaLink[],
    },
    danger: {
      wrap: "border-rose-200 bg-rose-50",
      title: "text-rose-900",
      body: "text-rose-900/80",
      note: "text-rose-900/70",
      primary: "bg-rose-600 text-white hover:bg-rose-700",
      secondary:
        "border-rose-300 bg-white text-rose-700 hover:bg-rose-100",
      heading: `資金は${simulation.monthsLeft ?? ""}か月以内に尽きます`,
      text:
        "すぐに収入を確保できる仕事を探してください。日払い・単発・寮付き求人に加えて、家賃負担を下げる選択肢も確認しておくと安全です。",
      links: [
        {
          label: "日払いで探す",
          href: AFFILIATE_LINKS.fullcast,
          disabled: !AFFILIATE_READY.fullcast,
        },
        {
          label: "寮付き求人を見る",
          href: AFFILIATE_LINKS.sumijob,
          disabled: !AFFILIATE_READY.sumijob,
        },
        {
          label: "引越し料金を比較する",
          href: AFFILIATE_LINKS.moving,
          disabled: !AFFILIATE_READY.moving,
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-bold sm:text-3xl">
            退職後の資金、何ヶ月で尽きるか簡易計算
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            今ある貯金と毎月の支出・収入から、生活資金がどのくらい持つかを簡易で確認できます。
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            状況が変わったタイミングで、再計算することをおすすめします。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-bold">入力</h2>

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
                <div className="flex items-center justify-between py-1">
                  <span>家賃</span>
                  <span className="font-semibold">{formatYen(values.rent)}円</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>その他固定費</span>
                  <span className="font-semibold">
                    {formatYen(values.livingCost)}円
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>月の食費</span>
                  <span className="font-semibold">
                    {formatYen(values.foodCost)}円
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>月のその他支出</span>
                  <span className="font-semibold">
                    {formatYen(values.miscCost)}円
                  </span>
                </div>

                <div className="mt-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between py-1">
                    <span>月の支出合計</span>
                    <span className="font-semibold">
                      {formatYen(values.monthlyExpense)}円
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>失業保険の日額</span>
                    <span className="font-semibold">
                      {formatYen(values.benefitDaily)}円
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>支給日数</span>
                    <span className="font-semibold">
                      {formatYen(values.benefitDays)}日
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>失業保険の終了目安</span>
                    <span className="font-semibold">
                      約{values.benefitMonths}か月
                    </span>
                  </div>

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

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">見方</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  このページは、毎月の支出がほぼ一定で、失業保険は入力した日額と支給日数の範囲で受け取る前提の、
                  12か月間の簡易シミュレーションです。
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  失業保険は約{values.benefitMonths}か月で終了する想定です。
                </p>
              </div>
            </div>

            <div className={`rounded-2xl border p-6 ${ctaConfig.wrap}`}>
              <h2 className={`text-lg font-bold ${ctaConfig.title}`}>
                {ctaConfig.heading}
              </h2>
              <p className={`mt-3 text-sm leading-6 ${ctaConfig.body}`}>
                {ctaConfig.text}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
                ※現在一部リンクは準備中です。提携承認後に利用できるようになります。
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

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                家賃を抑える選択肢もあります
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                資金が減る前に、住まいの固定費を下げる選択肢も確認しておくと安心です。
                家賃負担が大きい場合は、引越し費用を比較しておくことも検討できます。
              </p>

              <div className="mt-5">
                <CtaButton
                  link={{
                    label: "引越し料金を比較する",
                    href: AFFILIATE_LINKS.moving,
                    disabled: !AFFILIATE_READY.moving,
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  isFullWidth
                />
              </div>

              <p className="mt-3 text-xs text-slate-500">
                ※現在準備中です。提携承認後に外部サイトへ移動できるようになります。
              </p>
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
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base outline-none transition focus:border-slate-500"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          {label === "支給日数" ? "日" : "円"}
        </span>
      </div>
    </label>
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
  const baseClass = `inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition ${
    isPrimary ? "" : "border"
  } ${isFullWidth ? "w-full" : ""}`;

  if (link.disabled) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} cursor-not-allowed opacity-70 ${className}`}
      >
        {link.label}（準備中）
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
