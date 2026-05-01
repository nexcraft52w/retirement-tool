import { supabaseAdmin } from "../../../lib/supabase-admin";

type EventType = "view" | "pdf" | "postal";

type Metric = {
  label: string;
  eventType: EventType;
};

type CountSet = Record<EventType, number>;

type DailyRow = {
  label: string;
  view: number;
  pdf: number;
  postal: number;
};

const METRICS: Metric[] = [
  { label: "ページ閲覧", eventType: "view" },
  { label: "PDF出力", eventType: "pdf" },
  { label: "郵送ページ", eventType: "postal" },
];

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

async function countEvent(
  eventType: EventType,
  range?: { startIso: string; endIso: string }
) {
  let query = supabaseAdmin
    .from("access_counts")
    .select("*", { count: "exact", head: true })
    .eq("event_type", eventType);

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
      const count = await countEvent(metric.eventType, range);
      return [metric.eventType, count] as const;
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
        view: counts.view,
        pdf: counts.pdf,
        postal: counts.postal,
      };
    })
  );

  return rows;
}

export default async function AdminAnalyticsPage() {
  let total: CountSet = { view: 0, pdf: 0, postal: 0 };
  let week: CountSet = { view: 0, pdf: 0, postal: 0 };
  let today: CountSet = { view: 0, pdf: 0, postal: 0 };
  let dailyRows: DailyRow[] = [];
  let errorMessage = "";

  try {
    const todayRange = getJstRangeFromOffset(0, 1);
    const weekRange = getJstRangeFromOffset(-6, 1);

    [total, week, today, dailyRows] = await Promise.all([
      countSet(),
      countSet(weekRange),
      countSet(todayRange),
      getDailyRows(),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "アクセス数の取得に失敗しました。";
  }

  const maxValue = Math.max(
    1,
    ...dailyRows.flatMap((row) => [row.view, row.pdf, row.postal])
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">アクセス分析</h1>
          <p className="mt-2 text-sm text-slate-600">
            Supabaseの件数集計を使っているため、1000件を超えても件数は崩れません。
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
              <Legend label="ページ閲覧" className="bg-slate-400" />
              <Legend label="PDF出力" className="bg-emerald-500" />
              <Legend label="郵送ページ" className="bg-blue-500" />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="flex min-w-[900px] items-end gap-3 border-b border-slate-200 pb-4">
              {dailyRows.map((row) => (
                <div key={row.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-48 items-end gap-1">
                    <Bar value={row.view} maxValue={maxValue} className="bg-slate-400" />
                    <Bar value={row.pdf} maxValue={maxValue} className="bg-emerald-500" />
                    <Bar value={row.postal} maxValue={maxValue} className="bg-blue-500" />
                  </div>
                  <div className="text-xs text-slate-500">{row.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-3 pr-4">日付</th>
                  <th className="py-3 pr-4">ページ閲覧</th>
                  <th className="py-3 pr-4">PDF出力</th>
                  <th className="py-3 pr-4">郵送ページ</th>
                </tr>
              </thead>
              <tbody>
                {[...dailyRows].reverse().map((row) => (
                  <tr key={row.label} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-700">
                      {row.label}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{row.view}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.pdf}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.postal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ title, counts }: { title: string; counts: CountSet }) {
  const pdfRate = counts.view > 0 ? (counts.pdf / counts.view) * 100 : 0;
  const postalRate = counts.view > 0 ? (counts.postal / counts.view) * 100 : 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>

      <div className="mt-5 space-y-3">
        {METRICS.map((metric) => (
          <div
            key={metric.eventType}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
          >
            <span className="text-sm text-slate-600">{metric.label}</span>
            <span className="text-2xl font-bold text-slate-900">
              {counts[metric.eventType].toLocaleString("ja-JP")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        PDF率：{pdfRate.toFixed(1)}% ／ 郵送率：{postalRate.toFixed(1)}%
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
