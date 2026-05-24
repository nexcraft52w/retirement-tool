"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type SectionProps = {
  title: string;
  guide?: string;
  image?: string;
  children: ReactNode;
};

const BAASAMA_IMAGE_PATH = "/images/taishoku-baasama";

export default function RetirementChecklistPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800">
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6">
        <Link
          href="/"
          aria-label="退職ツールのトップへ戻る"
          className="block overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm"
        >
          <img
            src={`${BAASAMA_IMAGE_PATH}/taishoku-tool-header-banner.png`}
            alt="退職ツール"
            className="block h-auto w-full"
          />
        </Link>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-h-[150px] grid-cols-1 bg-gradient-to-r from-white via-sky-50 to-amber-50 md:grid-cols-[1fr_220px]">
            <div className="px-5 py-6 sm:px-6">
              <p className="text-xs font-bold text-amber-700">退職ばあ様の手続きチェック</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                退職前後のチェックリスト
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                退職前に確認しておきたい手続き・返却物・退職後の役所手続きなどをまとめています。
                必要なところから順番に確認してください。
              </p>
            </div>

            <div className="flex items-end justify-center bg-amber-50/50 px-4 pt-2 md:justify-end md:px-6">
              <img
                src={`${BAASAMA_IMAGE_PATH}/taishoku-baasama-half-guide.png`}
                alt="案内する退職ばあ様"
                className="h-36 w-auto object-contain sm:h-40"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Section
            title="1．退職意思・手続き"
            guide="まずは退職の意思を、どの形で伝えるかを決めましょう。話せない場合は、書面郵送も選択肢です。"
            image="taishoku-baasama-half-point.png"
          >
            <ul className="list-disc space-y-1 pl-5">
              <li>意思表示（口頭または書面）</li>
              <li>伝える相手は、上司・上役・総務など</li>
              <li>退職日は応相談（会社は引き止めがち／本人は早く辞めたい）</li>
              <li>直接話せない場合は、退職届を郵送する方法もある</li>
            </ul>
          </Section>

          <Section
            title="退職代行について"
            guide="費用を払う前に、自分で進められる範囲かどうかを確認しましょう。"
            image="taishoku-baasama-half-think.png"
          >
            <div className="space-y-3 leading-7">
              <p>
                退職代行を検討している方は、まず手数料を確認してください。
                その費用は本当に必要ですか？ あなたの時給で何時間分でしょうか。
              </p>

              <p>
                会社は基本的に、退職する人へ時間やコストはかけません。
                <strong className="font-bold text-slate-950">退職の意思を伝えること自体は無料です。</strong>
              </p>

              <p>
                体調不良で休まざるを得ない状況もありますが、それとは別に、退職の意思表示は手続きとして進める必要があります。
              </p>

              <p>どうしても難しい場合は、退職届を郵送して意思表示を行いましょう。</p>

              <p className="text-sm text-slate-500">
                ※退職届とあわせて必要事項も送れば、会社とのやり取りを減らせます。
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
              >
                退職届を作成する
              </Link>
            </div>
          </Section>
        </div>

        <Section
          title="2．返却・受取"
          guide="借りた物はまとめて返却。会社から受け取る書類も忘れず確認しましょう。"
          image="taishoku-baasama-half-gassho.png"
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-bold text-slate-950">返却（借りたもの）</p>
              <ul className="mt-2 list-disc pl-5">
                <li>例：制服・名札・携帯・PC・名刺・筆記具・車・ETCカードなど</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 lg:col-span-2">
              <p className="font-bold text-slate-950">受取（退職前に預けたものを回収）</p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>年金手帳または基礎年金番号通知書</li>
                <li>マイナンバーカード</li>
                <li>
                  雇用保険被保険者証（前職分の返却・現職分の受取を確認）
                  <details className="mt-2 rounded-2xl bg-sky-50 p-3">
                    <summary className="cursor-pointer text-sm font-bold text-sky-700">補足を見る</summary>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                      <p>前職の被保険者証を今の勤務先へ提出している場合があります。</p>
                      <p>退職時は、その前職分を返してもらっているか確認しましょう。</p>
                      <p>あわせて、今の勤務先で加入した分の被保険者証も確認しましょう。</p>
                      <p>紙ではなく、PDFやメール添付で発行されるケースもあります。</p>
                      <p>職場メールに残っていないかも確認が必要です。</p>
                    </div>
                  </details>
                </li>
                <li>前職の源泉徴収票</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 lg:col-span-3">
              <p className="font-bold text-slate-950">受取（退職後）</p>
              <ul className="mt-2 grid list-disc gap-x-8 gap-y-1 pl-5 sm:grid-cols-2 lg:grid-cols-4">
                <li>健康保険資格喪失証明書</li>
                <li>離職票</li>
                <li>源泉徴収票</li>
                <li>最後の給与明細</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            ※回収漏れがあると会社から連絡が来ます。貸与物は確実に返却しましょう。
          </p>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title="3．住所"
            guide="退職後に書類が届くことがあります。引っ越し予定がある場合は先に備えましょう。"
            image="taishoku-baasama-half-guide.png"
          >
            <ul className="list-disc pl-5">
              <li>引っ越し予定あり → 郵便局で転居届</li>
              <li>旧住所あての郵便も新住所に届くようにする</li>
            </ul>
            <p className="text-sm text-slate-500">※離職票など、後日届く書類があります。</p>
          </Section>

          <Section
            title="4．住民税"
            guide="退職後に見落としやすいのが住民税です。最後の給与と納付書を確認しましょう。"
            image="taishoku-baasama-half-think.png"
          >
            <div id="resident-tax" className="space-y-3">
              <p className="font-bold text-slate-950">住民税（前年の収入に対して発生）</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>自分で払う、または最後の給与で一括</li>
                <li>一括の場合、最後の給与の手取りが減る</li>
                <li>自分で払う場合、滞納に注意</li>
              </ul>

              <details className="rounded-2xl bg-sky-50 p-3">
                <summary className="cursor-pointer text-sm font-bold text-sky-700">補足を見る</summary>
                <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                  <p>住民税は前年の収入をもとに計算され、6月から翌年5月まで支払います。</p>
                  <p>会社在籍中は給与から天引き（特別徴収）ですが、退職後は自分で支払うか、最後の給与で一括精算となります。</p>
                  <p>1月〜5月の退職は一括徴収が基本です。</p>
                  <p>自分で支払う場合、後日納付書が届きます。放置すると延滞や差押えにつながる可能性があります。</p>
                  <p>入社直後の方は、まだ天引きが始まっていない場合もあるため、給与明細の「住民税」欄を確認してください。</p>
                </div>
              </details>
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title="5．退職後①（役所）"
            guide="退職後は、健康保険と年金の切替が必要になることがあります。"
            image="taishoku-baasama-half-point.png"
          >
            <ul className="list-disc pl-5">
              <li>健康保険 → 国民健康保険へ切替</li>
              <li>年金 → 国民年金へ切替</li>
            </ul>

            <details className="mt-3 rounded-2xl bg-sky-50 p-3">
              <summary className="cursor-pointer text-sm font-bold text-sky-700">手続きの流れを見る</summary>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <p>健康保険資格喪失証明書を受け取ってから区役所へ行きます。</p>
                <p>この書類は退職後すぐ発行される場合もありますが、数日〜1週間程度かかるケースもあります。</p>
                <p>書類なしで行っても手続きできないため、先に受取を確認しましょう。</p>
                <p>あわせて年金の切替（国民年金）も区役所で行います。</p>
                <p>支払いが難しい場合は、免除・猶予制度もあります。</p>
                <p>手続きを行わないと、将来の年金や給付に影響が出る可能性があります。</p>
              </div>
            </details>
          </Section>

          <Section
            title="6．退職後②（収入）"
            guide="離職票が届いたら、ハローワークで受給条件と金額を確認しましょう。"
            image="taishoku-baasama-half-present.png"
          >
            <ul className="list-disc pl-5">
              <li>離職票 → ハローワーク</li>
              <li>条件を満たせば失業保険</li>
              <li>金額確認 → 生活設計</li>
            </ul>

            <details className="mt-3 rounded-2xl bg-sky-50 p-3">
              <summary className="cursor-pointer text-sm font-bold text-sky-700">受給条件を見る</summary>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                <p>失業保険は、退職理由によって条件が変わります。</p>
                <p>
                  <strong>会社都合退職：</strong>
                  過去1年以内に、雇用保険の加入期間が6ヶ月以上
                </p>
                <p>
                  <strong>自己都合退職：</strong>
                  過去2年以内に、雇用保険の加入期間が1年以上
                </p>
                <p>
                  例：11ヶ月勤務の場合、あと1ヶ月で条件を満たすため、可能であればもう1ヶ月の勤務継続も検討しましょう。
                  退職の意思を伝えたうえで、「1か月後に退職したい」と申し出る形は一般的です。
                </p>
                <p>手続き後に受給額の試算が出るため、それをもとに生活設計を行いましょう。</p>
              </div>
            </details>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, guide, image = "taishoku-baasama-half-guide.png", children }: SectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-4 rounded-2xl bg-amber-50/70 p-4">
        <img
          src={`${BAASAMA_IMAGE_PATH}/${image}`}
          alt="退職ばあ様"
          className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
        />
        <div className="min-w-0 pt-1">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {guide ? <p className="mt-1 text-sm leading-6 text-slate-600">{guide}</p> : null}
        </div>
      </div>

      <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}
