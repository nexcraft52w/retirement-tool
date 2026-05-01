import { supabaseAdmin } from "@/lib/supabase/server";

type EpisodeRow = {
  id: string;
  created_at: string;
  pen_name: string | null;
  title: string | null;
  body: string | null;
  stress_relief: string | null;
  ai_polished_body: string | null;
  company_name: string | null;
  discount_type: string | null;
  discount_amount: number | null;
  is_publishable: boolean | null;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("ja-JP");
  } catch {
    return value;
  }
}

export default async function AdminEpisodesPage() {
  const { data, error } = await supabaseAdmin
    .from("episodes")
    .select(
      "id, created_at, pen_name, title, body, stress_relief, ai_polished_body, company_name, discount_type, discount_amount, is_publishable"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const episodes: EpisodeRow[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">投稿エピソード管理</h1>
          <p className="mt-2 text-sm text-slate-600">
            投稿一覧の確認ページです。まずは閲覧専用で復旧しています。
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700">
              総件数：{episodes.length}件
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-2 text-emerald-700">
              公開OK：{episodes.filter((item) => item.is_publishable).length}件
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-2 text-amber-700">
              非公開：{episodes.filter((item) => !item.is_publishable).length}件
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="font-semibold text-red-700">
              エピソード取得エラー
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
              {error.message}
            </div>
          </section>
        )}

        {!error && episodes.length === 0 && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              まだ投稿データがありません。
            </p>
          </section>
        )}

        {!error &&
          episodes.map((episode) => (
            <section
              key={episode.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">
                    投稿日時：{formatDate(episode.created_at)}
                  </div>

                  <h2 className="text-xl font-bold text-slate-900">
                    {episode.title || "無題"}
                  </h2>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      ペンネーム：{episode.pen_name || "未入力"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      会社名：{episode.company_name || "未入力"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      割引種別：{episode.discount_type || "-"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      割引額：{episode.discount_amount ?? 0}円
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        episode.is_publishable
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {episode.is_publishable ? "公開OK" : "非公開"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    原文
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {episode.body || "本文なし"}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-slate-900">
                    AI整形後
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {episode.ai_polished_body || "整形後本文なし"}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  ストレス発散方法
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {episode.stress_relief || "未入力"}
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-400 break-all">
                ID: {episode.id}
              </div>
            </section>
          ))}
      </div>
    </main>
  );
}