import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-white px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            読み込み中...
          </div>
        </main>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}