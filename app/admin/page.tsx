import Link from "next/link";

export default function Page() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-bold">管理画面</h1>

      <Link href="/admin/analytics" className="block underline">
        分析
      </Link>

      <Link href="/admin/episodes" className="block underline">
        エピソード
      </Link>

      <Link href="/admin/feedback-private" className="block underline">
        非公開フィードバック
      </Link>
    </main>
  );
}