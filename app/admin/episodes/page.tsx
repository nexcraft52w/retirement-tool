import { supabaseAdmin } from "@/lib/supabase/server";

type EpisodeRow = {
  id: string;
  created_at: string;
  pen_name: string | null;
  title: string | null;
  body: string | null;
  stress_relief: string | null;
  discount_type: string | null;
  discount_amount: number | null;
  is_publishable: boolean | null;
  published_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return value;
  }
}

function getPublishLabel(value: boolean | null) {
  return value ? "公開OK" : "非公開";
}

function getPublishClass(value: boolean | null) {
  return value
    ? "bg-green-50 text-green-700 border-green-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
}

function getDiscountLabel(type: string | null, amount: number | null) {
  if (!type || type === "none") return "未適用";
  if (type === "post") return `エピソード投稿割引 / ${amount ?? 0}円`;
  return `${type} / ${amount ?? 0}円`;
}

export default async function Page() {
  const { data, error } = await supabaseAdmin
    .from("episodes")
    .select(`
      id,
      created_at,
      pen_name,
      title,
      body,
      stress_relief,
      discount_type,
      discount_amount,
      is_publishable,
      published_at
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as EpisodeRow[];

  const totalCount = rows.length;
  const publicCount = rows.filter((row) => row.is_publishable === true).length;
  const privateCount = rows.filter((row) => row.is_publishable !== true).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">
            投稿エピソード管理
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            投稿された退職エピソードの確認ページです。公開OK／非公開の状態を確認できます。
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 font-semibold text-slate-700">
              総件数：{totalCount}件
            </div>
            <div className="rounded-2xl bg-green-50 px-4 py-3 font-semibold text-green-700">
              公開OK：{publicCount}件
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3 font-semibold text-amber-700">
              非公開：{privateCount}件
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="font-bold">エピソード取得エラー</h2>
            <p className="mt-2 text-sm">{error.message}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            まだ投稿はありません。
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <article
                key={row.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      投稿日：{formatDate(row.created_at)}
                    </div>

                    <h2 className="mt-2 text-lg font-bold text-slate-900">
                      {row.title || "（タイトルなし）"}
                    </h2>

                    <div className="mt-2 text-sm leading-6 text-slate-600">
                      ペンネーム：{row.pen_name || "-"}
                    </div>
                  </div>

                  <div
                    className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-bold ${getPublishClass(
                      row.is_publishable
                    )}`}
                  >
                    {getPublishLabel(row.is_publishable)}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      割引
                    </div>
                    <div className="mt-1 text-slate-800">
                      {getDiscountLabel(row.discount_type, row.discount_amount)}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500">
                      公開日時
                    </div>
                    <div className="mt-1 text-slate-800">
                      {formatDate(row.published_at)}
                    </div>
                  </div>
                </div>

                {row.stress_relief && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      ストレス発散方法
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {row.stress_relief}
                    </p>
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    本文
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {row.body || "-"}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-100 p-3 text-xs leading-6 text-slate-500">
                  ID：{row.id}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
