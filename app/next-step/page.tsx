"use client";

export default function RetirementChecklistPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* タイトル */}
        <h1 className="text-2xl font-bold text-center">
          退職前後のチェックリスト
        </h1>

        {/* 1 */}
        <Section title="1．退職意思・手続き">
          <ul className="list-disc pl-5 space-y-1">
            <li>意思表示（口頭 or 書面）</li>
            <li>上司（無理なら上役 or 総務）</li>
            <li>退職日：応相談（会社は引き止めがち／本人は早く辞めたい）</li>
            <li>話せない場合 → 退職届を郵送</li>
          </ul>
        </Section>

        {/* 退職代行 */}
            <Section title="退職代行について">
            <p>
            退職代行を検討している方は、まず手数料を確認してください。
            その費用は本当に必要ですか？ あなたの時給で何時間分でしょうか。
            </p>

            <p>
            会社は基本的に、退職する人へ時間やコストはかけません。
            <strong>退職の意思を伝えること自体は無料です。</strong>
            </p>

            <p>
            体調不良で休まざるを得ない状況もありますが、それとは別に、
            退職の意思表示は手続きとして進める必要があります。
            </p>

            <p>
            どうしても難しい場合は、退職届を郵送して意思表示を行いましょう。
            </p>

            <p className="text-sm text-gray-500">
            ※退職届とあわせて、必要事項も送ればやり取りを減らせます
            </p>
            <div className="pt-2">
            <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
            退職届を作る
            </a>
            </div>
        </Section>

        <Section title="2．返却・受取">

            <p className="font-semibold">返却（借りたもの）</p>
            <ul className="list-disc pl-5">
                <li>例：制服・名札・携帯・PC・名刺・筆記具・車（ETC）など</li>
            </ul>

            <p className="font-semibold pt-2">受取（退職前に預けたものを回収）</p>
            <ul className="list-disc pl-5">
                <li>年金手帳 or 基礎年金番号通知書</li>
                <li>マイナンバーカード</li>
                <li>
                雇用保険被保険者証（前職分の返却・現職分の受取を確認）
                <details className="mt-1">
                <summary className="cursor-pointer text-sm text-blue-600">
                    補足を見る
                </summary>
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>前職の被保険者証を今の勤務先へ提出している場合があります。</p>
                    <p>退職時は、その前職分を返してもらっているか確認しましょう。</p>
                    <p>あわせて、今の勤務先で加入した分の被保険者証も確認しましょう。</p>
                    <p>紙ではなく、PDFやメール添付で発行されるケースが増えています。</p>
                    <p>職場メールに残っていないかも確認が必要です。</p>
                    </div>
                </details>
            </li>
            <li>前職の源泉徴収票</li>
            </ul>

            <p className="font-semibold pt-2">受取（退職後）</p>
            <ul className="list-disc pl-5">
                <li>健康保険資格喪失証明書</li>
                <li>離職票</li>
                <li>源泉徴収票</li>
                <li>最後の給与明細</li>
            </ul>

            <p className="text-sm text-gray-500 pt-2">
                ※回収漏れがあると会社から連絡が来ます。貸与物は確実に返却しましょう
            </p>

        </Section>

        {/* 3 */}
        <Section title="3．住所">
          <ul className="list-disc pl-5">
            <li>引っ越し予定あり → 郵便局で転居届</li>
            <li>旧住所の郵便も新住所に届く</li>
          </ul>
          <p className="text-sm text-gray-500">
            ※離職票など後日届く書類がある
          </p>
        </Section>

        {/* 4 */}
        <Section title="4．住民税">
          <li>
          住民税（前年の収入に対して発生）
            <ul className="list-disc pl-5">
            <li>自分で払う or 最後の給与で一括</li>
            <li>一括 → 最後の給与が減る</li>
            <li>自分で払う → 滞納注意（差押えリスク）</li>
            </ul>

            <details className="mt-2">
            <summary className="cursor-pointer text-sm text-blue-600">
                補足を見る
            </summary>

            <div className="mt-2 text-sm text-gray-600 space-y-2">
            <p>
                住民税は前年の収入をもとに計算され、6月から翌年5月まで支払います。
            </p>

            <p>
                会社在籍中は給与から天引き（特別徴収）ですが、
                退職後は自分で支払うか、最後の給与で一括精算となります。
            </p>

            <p>
                1月〜5月の退職は一括徴収が基本です。
            </p>

            <p>
                自分で支払う場合、後日納付書が届きます。
                放置すると延滞や差押えにつながる可能性があります。
            </p>

            <p>
                入社直後の方は、まだ天引きが始まっていない場合もあるため、
                給与明細の「住民税」欄を確認してください。
            </p>
            </div>
        </details>
        </li>
        </Section>

        {/* 5 */}
        <Section title="5．退職後①（役所）">
          <ul className="list-disc pl-5">
            <li>健康保険 → 国民健康保険へ切替</li>
            <li>年金 → 国民年金へ切替</li>
            </ul>

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-blue-600">
                手続きの流れを見る
            </summary>
        <div className="mt-2 text-sm text-gray-600 space-y-2">
            <p>
                健康保険資格喪失証明書を受け取ってから区役所へ行きます。
            </p>
            <p>
                この書類は退職後すぐ発行される場合もありますが、
                数日〜1週間程度かかるケースもあります。
            </p>
            <p>
                書類なしで行っても手続きできないため、先に受取を確認しましょう。
            </p>
            <p>
                あわせて年金の切替（国民年金）も区役所で行います。
            </p>
            <p>
                支払いが難しい場合は、免除・猶予制度もあります。
            </p>
            <p>
                手続きを行わないと、将来の年金や給付に影響が出る可能性があります。
            </p>
        </div>
        </details>
        </Section>

        {/* 6 */}
        <Section title="6．退職後②（収入）">

  <ul className="list-disc pl-5">
    <li>離職票 → ハローワーク</li>
    <li>条件満たせば失業保険</li>
    <li>金額確認 → 生活設計</li>
  </ul>

  <details className="mt-2">
    <summary className="cursor-pointer text-sm text-blue-600">
      受給条件を見る
    </summary>

    <div className="mt-2 text-sm text-gray-600 space-y-2">
      <p>
        失業保険は、退職理由によって条件が変わります。
      </p>

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

      <p>
        手続き後に受給額の試算が出るため、それをもとに生活設計を行いましょう。
      </p>
    </div>
  </details>

</Section>

      </div>
    </div>
  );
}

// セクション共通コンポーネント
function Section({ title, children }: any) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-2">
      <h2 className="font-bold text-lg">{title}</h2>
      {children}
    </div>
  );
}