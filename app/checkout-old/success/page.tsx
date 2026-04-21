import { Suspense } from "react";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white px-4 py-10">読み込み中...</div>}>
      <CheckoutSuccessClient />
    </Suspense>
  );
}