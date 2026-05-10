import { supabaseAdmin } from "@/lib/supabase/server";

type Row = {
  created_at: string;
  rating: string | null;
  message: string | null;
};

export default async function Page() {
  const { data, error } = await supabaseAdmin
    .from("user_feedback")
    .select("created_at, rating, message")
    .eq("type", "feedback")
    .or("is_publishable.eq.false,is_publishable.is.null")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return <div>error</div>;
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">公開NGフィードバック</h1>

      <div className="space-y-4">
        {data?.map((row, i) => (
          <div key={i} className="border p-4 rounded">
            <div className="text-sm text-gray-500">
              {new Date(row.created_at).toLocaleString("ja-JP")}
            </div>
            <div className="font-semibold">{row.rating}</div>
            <div className="mt-2 whitespace-pre-wrap">{row.message}</div>
          </div>
        ))}
      </div>
    </main>
  );
}