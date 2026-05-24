import OpenAI from "openai";
import { NextResponse } from "next/server";

type RequestBody = {
  penName?: string;
  subject?: string;
  body?: string;
  stressRelief?: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が未設定です。" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const json = (await req.json()) as RequestBody;

    const penName = (json.penName || "").trim();
    const subject = (json.subject || "").trim();
    const body = (json.body || "").trim();
    const stressRelief = (json.stressRelief || "").trim();

    if (!penName) {
      return NextResponse.json(
        { error: "ペンネームを入力してください。" },
        { status: 400 }
      );
    }

    if (subject.length < 4) {
      return NextResponse.json(
        { error: "件名は4文字以上で入力してください。" },
        { status: 400 }
      );
    }

    if (body.length < 150) {
      return NextResponse.json(
        { error: "本文は150文字以上で入力してください。" },
        { status: 400 }
      );
    }

    const prompt = `
あなたは、退職を考えている人に寄り添う編集者です。
以下の退職エピソードを、同じように悩んでいる人が「わかる」と感じられる文章に整形してください。

目的:
- 素の本音は残す
- 読みやすくする
- 仲間意識・共感が生まれる文にする
- 誇張しすぎない
- 被害感情だけに寄りすぎず、事実と気持ちを自然につなぐ
- 個人名・会社名・部署名・地名など特定につながる情報は一般化する
- 誹謗中傷っぽい断定表現はやわらげる
- 日本語として自然で、投稿文として読みやすい形にする

ルール:
- 出力はJSONのみ
- bodyPolishedは300〜700文字程度
- stressReliefPolishedは入力があるときだけ自然な文章に整える
- penNameはそのまま返す
- subjectは必要なら少し読みやすく整えてよい
- 名前は「上司」「同僚」「会社」などに置き換える
- 断定しすぎる表現は「と感じました」「ように思いました」などに整える

返却JSONスキーマ:
{
  "penName": "string",
  "subjectPolished": "string",
  "bodyPolished": "string",
  "stressReliefPolished": "string",
  "anonymousCheckNote": "string"
}

入力:
ペンネーム: ${penName}
件名: ${subject}
本文:
${body}

職場で感じたストレスの発散方法:
${stressRelief || "未入力"}
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      reasoning: { effort: "low" },
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "episode_polish_result",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              penName: { type: "string" },
              subjectPolished: { type: "string" },
              bodyPolished: { type: "string" },
              stressReliefPolished: { type: "string" },
              anonymousCheckNote: { type: "string" },
            },
            required: [
              "penName",
              "subjectPolished",
              "bodyPolished",
              "stressReliefPolished",
              "anonymousCheckNote",
            ],
          },
        },
      },
    });

    const content = response.output_text;

    if (!content) {
      return NextResponse.json(
        { error: "AIの返答が空でした。" },
        { status: 500 }
      );
    }

    let parsed: {
      penName: string;
      subjectPolished: string;
      bodyPolished: string;
      stressReliefPolished: string;
      anonymousCheckNote: string;
    };

    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("JSON parse error:", content);
      return NextResponse.json(
        {
          error: "AIの返答形式が不正でした。",
          detail: content,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("episode-polish error:", error);

    return NextResponse.json(
      {
        error: "AI整形に失敗しました。",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
