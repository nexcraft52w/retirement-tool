"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SavedFormState = {
  name?: string;
  address?: string;
  companyName?: string;
  companyAddress?: string;
};

type ResidentTaxType = "collect" | "self" | "none";
type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";
type DepositDocsMode = "none" | "has";

type WebMailForm = {
  department: string;
  recipientName: string;

  companyZip: string;
  companyAddress1: string;
  companyAddress2: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;

  returnItemsMode: ReturnItemsMode;
  returnItemsNote: string;

  depositDocsMode: DepositDocsMode;
  depositPensionBook: boolean;
  depositEmploymentInsurance: boolean;
  depositMyNumberCard: boolean;

  belongingsMode: BelongingsMode;
  belongingsNote: string;

  residentTaxType: ResidentTaxType;
};

const STORAGE_KEY = "retirement-document-form-v1";

const emptyForm: WebMailForm = {
  department: "",
  recipientName: "",

  companyZip: "",
  companyAddress1: "",
  companyAddress2: "",

  senderZip: "",
  senderAddress1: "",
  senderAddress2: "",

  returnItemsMode: "none",
  returnItemsNote: "",

  depositDocsMode: "none",
  depositPensionBook: false,
  depositEmploymentInsurance: false,
  depositMyNumberCard: false,

  belongingsMode: "none",
  belongingsNote: "",

  residentTaxType: "none",
};

const normalizeZip = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
};

const withSingleSama = (value: string) => {
  const t = value.trim();
  if (!t) return "ご担当者様";
  return t.replace(/様+$/, "") + "様";
};

export default function WebMailPage() {
  const [form, setForm] = useState<WebMailForm>(emptyForm);
  const [companyName, setCompanyName] = useState("");
  const [senderName, setSenderName] = useState("");

  const companyZipRef = useRef("");
  const senderZipRef = useRef("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const saved: SavedFormState = JSON.parse(raw);
      setCompanyName(saved.companyName || "");
      setSenderName(saved.name || "");
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAddress = async (zip: string, type: "company" | "sender") => {
    const digits = zip.replace(/\D/g, "");
    if (digits.length !== 7) return;

    if (type === "company" && companyZipRef.current === digits) return;
    if (type === "sender" && senderZipRef.current === digits) return;

    try {
      const res = await fetch(`/api/zipcode?zipcode=${digits}`);
      const data = await res.json();

      if (!data?.ok) return;

      const address = `${data.prefecture}${data.city}${data.town}`;

      setForm((prev) => {
        if (type === "company") {
          companyZipRef.current = digits;
          return {
            ...prev,
            companyAddress1: address,
          };
        }

        senderZipRef.current = digits;
        return {
          ...prev,
          senderAddress1: address,
        };
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const digits = form.companyZip.replace(/\D/g, "");
    if (digits.length === 7) {
      fetchAddress(form.companyZip, "company");
    } else {
      companyZipRef.current = "";
    }
  }, [form.companyZip]);

  useEffect(() => {
    const digits = form.senderZip.replace(/\D/g, "");
    if (digits.length === 7) {
      fetchAddress(form.senderZip, "sender");
    } else {
      senderZipRef.current = "";
    }
  }, [form.senderZip]);

  const handleChange =
    (key: keyof WebMailForm) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      const target = e.target as HTMLInputElement;
      let value: string | boolean = target.type === "checkbox" ? target.checked : target.value;

      if (key === "companyZip" || key === "senderZip") {
        value = normalizeZip(String(value));
      }

      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
    };

  const preview = useMemo(() => {
    const residentTaxText =
       form.residentTaxType === "collect"
        ? "住民税は一括徴収でお願いいたします。"
        : form.residentTaxType === "self"
        ? "住民税は普通徴収に切り替えていただけますと幸いです。"
        : "";
    
    const requestedDocs = ["源泉徴収票", "最後の給与明細", "離職票"];

    if (form.depositDocsMode === "has") {
      if (form.depositPensionBook) requestedDocs.push("年金手帳");
      if (form.depositEmploymentInsurance) requestedDocs.push("雇用保険被保険者証");
      if (form.depositMyNumberCard) requestedDocs.push("マイナンバーカード");
    }

    return {
      companyName: companyName || "未入力",
      senderName: senderName || "未入力",
      companyZip: form.companyZip,
      companyAddress1: form.companyAddress1 || "未入力",
      companyAddress2: form.companyAddress2,
      senderZip: form.senderZip,
      senderAddress1: form.senderAddress1 || "未入力",
      senderAddress2: form.senderAddress2,
      recipientName: withSingleSama(form.recipientName),
      department: form.department,
      returnItemsMode: form.returnItemsMode,
      returnItemsNote: form.returnItemsNote.trim(),
      belongingsMode: form.belongingsMode,
      belongingsNote: form.belongingsNote.trim(),
      requestedDocs,
      residentTaxText,
    };
  }, [form, companyName, senderName]);

  const canProceed =
    !!form.companyAddress1 &&
    !!form.senderAddress1 &&
    !!form.recipientName;

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 左 */}
          <section className="rounded-3xl border bg-white p-6">
            <h1 className="mb-6 text-2xl font-bold">入力フォーム</h1>

            <div className="space-y-4">
              <Field
                label="所属部署名"
                value={form.department}
                onChange={handleChange("department")}
              />

              <Field
                label="宛名"
                value={form.recipientName}
                onChange={handleChange("recipientName")}
                placeholder="ご担当者"
              />

              <hr />

              <Field
                label="会社住所（郵便番号）"
                value={form.companyZip}
                onChange={handleChange("companyZip")}
              />
              <Field
                label="会社住所1"
                value={form.companyAddress1}
                onChange={handleChange("companyAddress1")}
              />
              <Field
                label="会社住所2"
                value={form.companyAddress2}
                onChange={handleChange("companyAddress2")}
              />

              <hr />

              <Field
                label="差出人住所（郵便番号）"
                value={form.senderZip}
                onChange={handleChange("senderZip")}
              />
              <Field
                label="差出人住所1"
                value={form.senderAddress1}
                onChange={handleChange("senderAddress1")}
              />
              <Field
                label="差出人住所2"
                value={form.senderAddress2}
                onChange={handleChange("senderAddress2")}
              />

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">返却頂くもの</div>
                <div className="rounded-xl border bg-slate-50 p-4 text-sm leading-7">
                  <div>・源泉徴収票</div>
                  <div>・最後の給与明細</div>
                  <div>・離職票</div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="depositDocsMode"
                      value="none"
                      checked={form.depositDocsMode === "none"}
                      onChange={handleChange("depositDocsMode")}
                    />
                    預けていない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="depositDocsMode"
                      value="has"
                      checked={form.depositDocsMode === "has"}
                      onChange={handleChange("depositDocsMode")}
                    />
                    預けてしまっている
                  </label>
                </div>

                {form.depositDocsMode === "has" && (
                  <div className="mt-3 space-y-2 rounded-xl border bg-slate-50 p-4">
                    <label className="flex items-center gap-2 text-base">
                      <input
                        type="checkbox"
                        checked={form.depositPensionBook}
                        onChange={handleChange("depositPensionBook")}
                      />
                      年金手帳
                    </label>

                    <label className="flex items-center gap-2 text-base">
                      <input
                        type="checkbox"
                        checked={form.depositEmploymentInsurance}
                        onChange={handleChange("depositEmploymentInsurance")}
                      />
                      雇用保険被保険者証
                    </label>

                    <label className="flex items-center gap-2 text-base">
                      <input
                        type="checkbox"
                        checked={form.depositMyNumberCard}
                        onChange={handleChange("depositMyNumberCard")}
                      />
                      マイナンバーカード
                    </label>
                  </div>
                )}
              </div>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">私物返送</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="belongingsMode"
                      value="none"
                      checked={form.belongingsMode === "none"}
                      onChange={handleChange("belongingsMode")}
                    />
                    追記しない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="belongingsMode"
                      value="request"
                      checked={form.belongingsMode === "request"}
                      onChange={handleChange("belongingsMode")}
                    />
                    私物返送をお願いする
                  </label>
                </div>
              </div>

              {form.belongingsMode === "request" && (
                <TextAreaField
                  label="私物入力欄"
                  value={form.belongingsNote}
                  onChange={handleChange("belongingsNote")}
                  placeholder="例：デスク引き出し内の私物、ロッカー内の衣類、手帳 など"
                />
              )}

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">返却物</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="returnItemsMode"
                      value="none"
                      checked={form.returnItemsMode === "none"}
                      onChange={handleChange("returnItemsMode")}
                    />
                    追記しない
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="returnItemsMode"
                      value="return"
                      checked={form.returnItemsMode === "return"}
                      onChange={handleChange("returnItemsMode")}
                    />
                    返却物を記載する
                  </label>
                </div>
              </div>

              {form.returnItemsMode === "return" && (
                <TextAreaField
                  label="返却物入力欄"
                  value={form.returnItemsNote}
                  onChange={handleChange("returnItemsNote")}
                  placeholder="例：制服・名札・携帯・名刺"
                />
              )}

              <div className="space-y-3 rounded-xl border bg-amber-50 p-4 text-sm leading-7 text-slate-700">
                <p>
                  レターパックに入らない場合は、お手数ですがゆうパックや宅配便を検討してください。
                </p>
                <p>
                  ゆうパックや宅配便の場合は、当ページのあて名書きが使えません。
                </p>
                <p className="font-bold text-slate-900">
                  会社側も回収物が残ってしまった場合は、貴方へ連絡を取らざるを得なくなります。
                </p>
                <p className="font-bold text-slate-900">
                  やり取りを減らすためにも、返却はしておきましょう。
                </p>
              </div>

              <hr />

              <div>
                <div className="mb-2 block text-lg font-bold">住民税</div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="collect"
                      checked={form.residentTaxType === "collect"}
                      onChange={handleChange("residentTaxType")}
                    />
                    一括徴収
                  </label>

                  <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="self"
                      checked={form.residentTaxType === "self"}
                      onChange={handleChange("residentTaxType")}
                    />
                    自分で支払います
                  </label>
                   <label className="flex items-center gap-2 text-base">
                    <input
                      type="radio"
                      name="residentTaxType"
                      value="none"
                      checked={form.residentTaxType === "none"}
                      onChange={handleChange("residentTaxType")}
                    />
                    記載しない
                    </label>
                </div>
              </div>
            </div>
          </section>

          {/* 右 */}
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6">
              <h2 className="mb-4 text-center text-2xl font-bold">送り状</h2>

                {/* 宛名 */}
                <div className="mt-4">
                  <div className="text-xl font-bold">{preview.companyName || "未入力"}</div>
                  <div>{preview.department || ""}</div>
                  <div>{preview.recipientName || "ご担当者様"}</div>
                </div>

                {/* 差出人情報 */}
                <div className="mt-6 text-right">
                  <div className="inline-block text-sm leading-7 text-left">
                    <div>〒{preview.senderPostalCode || "未入力"}</div>
                    <div className="whitespace-pre-line">
                      {preview.senderAddress || "未入力"}
                    </div>
                    <div>{preview.senderName || "未入力"}</div>
                  </div>
                </div>

             <div className="mt-6 space-y-4 text-sm leading-7">
               <p>拝啓</p>

                <p>
                  お世話になっております。
                  <br />
                  退職に伴う書類を送付いたします。
                </p>

                  {(preview.belongingsMode === "request" ||
                    preview.returnItemsMode === "return") && (
                    <div className="space-y-2">
                      {preview.belongingsMode === "request" && (
                        <p>
                          お手数をおかけしますが、私物は着払いにて送付をお願いいたします。
                          {preview.belongingsNote && (
                          <>
                        <br />
                        私物内容：{preview.belongingsNote}
                          </>
                          )}
                        </p>
                      )}

                        {preview.returnItemsMode === "return" && (
                        <p>
                          貸与頂いていましたものをお返しいたします。
                          {preview.returnItemsNote && (
                          <>
                          <br />
                            返却物：{preview.returnItemsNote}
                           </>
                          )}
                        </p>
                          )}
                          </div>
                          )}

                      {preview.residentTaxText && <p>{preview.residentTaxText}</p>}

                        <p>
                        ご返却いただく、{preview.requestedDocs.join("・")}は、
                          <br />
                        こちらの書類の送り元住所にご返送をお願い致します。
                        </p>

                        <p>ご確認のほど、よろしくお願いいたします。</p>

                          <p className="pt-6 text-right">敬具</p>
                </div>
            </section>

            <section className="rounded-3xl border bg-white p-6">
              <h2 className="mb-4 text-center text-xl font-bold">
                レターパックライト
              </h2>

              <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
                <div className="mb-2 text-sm font-bold">お届け先</div>
                <div>{preview.companyZip}</div>
                <div>{preview.companyAddress1}</div>
                <div>{preview.companyAddress2}</div>
                <div>{preview.companyName}</div>
                <div>{preview.department}</div>
                <div>{preview.recipientName}</div>

                <div className="mt-4 text-sm font-bold">ご依頼主</div>
                <div>{preview.senderZip}</div>
                <div>{preview.senderAddress1}</div>
                <div>{preview.senderAddress2}</div>
                <div>{preview.senderName}</div>
              </div>
            </section>

            <button
              disabled={!canProceed}
              className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:bg-gray-300"
            >
              この内容で進む
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-lg font-bold">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border p-3"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-lg font-bold">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border p-3"
      />
    </div>
  );
}