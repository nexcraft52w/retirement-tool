export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase/server";

type EventType =
  | "page_view"
  | "click"
  | "pdf_download"
  | "postal_start"
  | "checkout_start"
  | "checkout_success";

type LegacyEventType = "view" | "pdf" | "postal";

type StoredEventType = EventType | LegacyEventType;

type MetricKey =
  | "pageView"
  | "pdfDownload"
  | "postalStart"
  | "checkoutStart"
  | "checkoutSuccess";

type Metric = {
  key: MetricKey;
  label: string;
  eventTypes: StoredEventType[];
  barClassName: string;
};

type CountSet = Record<MetricKey, number>;

type DailyRow = {
  label: string;
} & CountSet;

type PagePathRow = {
  pagePath: string;
} & CountSet;

const METRICS: Metric[] = [
  {
    key: "pageView",
    label: "ページ閲覧",
    eventTypes: ["page_view", "view"],
    barClassName: "bg-slate-400",
  },
  {
    key: "pdfDownload",
    label: "PDF出力",
    eventTypes: ["pdf_download", "pdf"],
    barClassName: "bg-emerald-500",
  },
  {
    key: "postalStart",
    label: "郵送開始",
    eventTypes: ["postal_start", "postal"],
    barClassName: "bg-blue-500",
  },
  {
    key: "checkoutStart",
    label: "決済開始",
    eventTypes: ["checkout_start"],
    barClassName: "bg-amber-500",
  },
  {
    key: "checkoutSuccess",
    label: "決済完了",
    eventTypes: ["checkout_success"],
    barClassName: "bg-violet-500",
  },
];

const EMPTY_COUNTS: CountSet = {
  pageView: 0,
  pdfDownload: 0,
  postalStart: 0,
  checkoutStart: 0,
  checkoutSuccess: 0,
};

const GRAPH_DAYS = 30;

function toJstDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  return { year, month, day };
}

function jstStartToUtcIso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0)).toISOString();
}

function addDaysToJstDate(
  date: { year: number; month: number; day: number },
  days: number
) {
  const base = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function formatJstLabel(date: { year: number; month: number; day: number }) {
  return `${date.month}/${date.day}`;
}

function getJstDayRange(offsetDays: number) {
  const today = toJstDateParts(new Date());
  const target = addDaysToJstDate(today, offsetDays);
  const next = addDaysToJstDate(target, 1);

  return {
    label: formatJstLabel(target),
    startIso: jstStartToUtcIso(target.year, target.month, target.day),
    endIso: jstStartToUtcIso(next.year, next.month, next.day),
  };
}

function getJstRangeFromOffset(startOffsetDays: number, endOffsetDays: number) {
  const today = toJstDateParts(new Date());
  const start = addDaysToJstDate(today, startOffsetDays);
  const end = addDaysToJstDate(today, endOffsetDays);

  return {
    startIso: jstStartToUtcIso(start.year, start.month, start.day),
    endIso: jstStartToUtcIso(end.year, end.month, end.day),
  };
}

async function countMetric(
  metric: Metric,
  range?: { startIso: string; endIso: string }
) {
  let query = supabaseAdmin
    .from("access_counts")
    .select("*", { count: "exact", head: true })
    .in("event_type", metric.eventTypes);

  if (range) {
    query = query.gte("created_at", range.startIso).lt("created_at", range.endIso);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countSet(range?: { startIso: string; endIso: string }) {
  const entries = await Promise.all(
    METRICS.map(async (metric) => {
      const count = await countMetric(metric, range);
      return [metric.key, count] as const;
    })
  );

  return Object.fromEntries(entries) as CountSet;
}

async function getDailyRows() {
  const rows = await Promise.all(
    Array.from({ length: GRAPH_DAYS }, async (_, index) => {
      const offset = index - (GRAPH_DAYS - 1);
      const range = getJstDayRange(offset);
      const counts = await countSet(range);

      return {
        label: range.label,
        ...counts,
      };
    })
  );

  return rows;
}

async function getPagePathRows(range: { startIso: string; endIso: string }) {
  const { data, error } = await supabaseAdmin
    .from("access_counts")
    .select("event_type,page_path")
    .gte("created_at", range.startIso)
    .lt("created_at", range.endIso)
    .range(0, 4999);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, CountSet>();

  for (const item of data ?? []) {
    const pagePath =
      typeof item.page_path === "string" && item.page_path.trim()
        ? item.page_path.trim()
        : "未記録";

    if (!map.has(pagePath)) {
      map.set(pagePath, { ...EMPTY_COUNTS });
    }

    const counts = map.get(pagePath);
    if (!counts) continue;

    const matchedMetric = METRICS.find((metric) =>
      metric.eventTypes.includes(item.event_type as StoredEventType)
    );

    if (matchedMetric) {
      counts[matchedMetric.key] += 1;
    }
  }

  return [...map.entries()]
    .map(([pagePath, counts]) => ({
      pagePath,
      ...counts,
    }))
    .sort((a, b) => b.pageView - a.pageView);
}

export default async function AdminAnalyticsPage() {
  let total: CountSet = { ...EMPTY_COUNTS };
  let week: CountSet = { ...EMPTY_COUNTS };
  let today: CountSet = { ...EMPTY_COUNTS };
  let dailyRows: DailyRow[] = [];
  let pagePathRows: PagePathRow[] = [];
  let errorMessage = "";

  try {
    const todayRange = getJstRangeFromOffset(0, 1);
    const weekRange = getJstRangeFromOffset(-6, 1);
    const graphRange = getJstRangeFromOffset(-(GRAPH_DAYS - 1), 1);

    [total, week, today, dailyRows, pagePathRows] = await Promise.all([
      countSet(),
      countSet(weekRange),
      countSet(todayRange),
      getDailyRows(),
      getPagePathRows(graphRange),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "アクセス数の取得に失敗しました。";
  }

  const maxValue = Math.max(
    1,
    ...dailyRows.flatMap((row) => METRICS.map((metric) => row[metric.key]))
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">アクセス分析</h1>
          <p className="mt-2 text-sm text-slate-600">
            page_path / event_type を見る形式に変更済み。旧データの view / pdf /
            postal も集計に含めています。
          </p>
        </section>

        {errorMessage && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="font-semibold text-red-700">アクセス数取得エラー</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-red-700">
              {errorMessage}
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          <SummaryCard title="累計" counts={total} />
          <SummaryCard title="今週（日本時間・直近7日）" counts={week} />
          <SummaryCard title="今日（日本時間）" counts={today} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">日別推移</h2>
              <p className="mt-1 text-sm text-slate-600">
                直近{GRAPH_DAYS}日 / 日本時間基準
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {METRICS.map((metric) => (
                <Legend
                  key={metric.key}
                  label={metric.label}
                  className={metric.barClassName}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-[900px] items-end gap-3 border-b border-slate-200 pb-4">
              {dailyRows.map((row) => (
                <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 items-end gap-1">
                    {METRICS.map((metric) => (
                      <Bar
                        key={metric.key}
                        value={row[metric.key]}
                        maxValue={maxValue}
                        className={metric.barClassName}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-500">{row.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4">日付</th>
                  {METRICS.map((metric) => (
                    <th key={metric.key} className="py-3 pr-4">
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...dailyRows].reverse().map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700">
                      {row.label}
                    </td>
                    {METRICS.map((metric) => (
                      <td key={metric.key} className="py-3 pr-4 text-slate-700">
                        {row[metric.key].toLocaleString("ja-JP")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">ページ別集計</h2>
          <p className="mt-1 text-sm text-slate-600">
            直近{GRAPH_DAYS}日 / 新形式で送信された page_path を集計。旧データは
            page_path が無いため「未記録」に入ります。
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4">ページ</th>
                  {METRICS.map((metric) => (
                    <th key={metric.key} className="py-3 pr-4">
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagePathRows.map((row) => (
                  <tr key={row.pagePath} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700">
                      {row.pagePath}
                    </td>
                    {METRICS.map((metric) => (
                      <td key={metric.key} className="py-3 pr-4 text-slate-700">
                        {row[metric.key].toLocaleString("ja-JP")}
                      </td>
                    ))}
                  </tr>
                ))}

                {pagePathRows.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-slate-500" colSpan={METRICS.length + 1}>
                      まだページ別データがありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ title, counts }: { title: string; counts: CountSet }) {
  const pdfRate = counts.pageView > 0 ? (counts.pdfDownload / counts.pageView) * 100 : 0;
  const postalRate = counts.pageView > 0 ? (counts.postalStart / counts.pageView) * 100 : 0;
  const checkoutRate =
    counts.checkoutStart > 0 ? (counts.checkoutSuccess / counts.checkoutStart) * 100 : 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>

      <div className="mt-5 space-y-3">
        {METRICS.map((metric) => (
          <div
            key={metric.key}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
          >
            <span className="text-sm text-slate-600">{metric.label}</span>
            <span className="text-2xl font-bold text-slate-900">
              {counts[metric.key].toLocaleString("ja-JP")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <div>PDF率：{pdfRate.toFixed(1)}%</div>
        <div>郵送開始率：{postalRate.toFixed(1)}%</div>
        <div>決済完了率：{checkoutRate.toFixed(1)}%</div>
      </div>
    </section>
  );
}

function Legend({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function Bar({
  value,
  maxValue,
  className,
}: {
  value: number;
  maxValue: number;
  className: string;
}) {
  const height = Math.max(2, Math.round((value / maxValue) * 180));

  return (
    <div className="flex w-2 flex-col items-center justify-end">
      <div
        title={`${value}`}
        className={`w-2 rounded-t ${className}`}
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
