"use client";

import type React from "react";

type ReturnItemsMode = "none" | "return";
type BelongingsMode = "none" | "request";

export type LetterSheetPreviewData = {
  companyName: string;
  senderName: string;

  senderZip: string;
  senderAddress1: string;
  senderAddress2: string;

  itemName: string;

  recipientName: string;
  department: string;
  returnItemsMode: ReturnItemsMode;
  returnItemsNote: string;
  belongingsMode: BelongingsMode;
  belongingsNote: string;
  requestedDocsBase: string[];
  requestedDocsExtra: string[];
  residentTaxText: string;
};

export default function LetterSheetPreview({
  preview,
  bodySections,
  showSample = true,
}: {
  preview: LetterSheetPreviewData;
  bodySections: string[];
  showSample?: boolean;
}) {
  const blockCopy = (e: React.ClipboardEvent | React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="overflow-auto px-6 pb-6">
      <div
        className="mx-auto overflow-hidden border bg-white shadow-sm"
        style={{
          width: "760px",
          height: "1074px",
        }}
        onCopy={blockCopy}
        onCut={blockCopy}
        onContextMenu={blockCopy}
      >
        <div
          style={{
            width: "760px",
            height: "1074px",
            padding: "48px",
            boxSizing: "border-box",
            background: "#fff",
            color: "#111",
            position: "relative",
            fontFamily: "sans-serif",
            userSelect: "none",
            WebkitUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          <LetterSheetContent
            preview={preview}
            bodySections={bodySections}
            showSample={showSample}
          />
        </div>
      </div>
    </div>
  );
}

function LetterSheetContent({
  preview,
  bodySections,
  showSample,
}: {
  preview: LetterSheetPreviewData;
  bodySections: string[];
  showSample: boolean;
}) {
  const pxPerMm = 3.6;
  const mul = (value: number) => `${value * pxPerMm}px`;

  return (
    <>
      {showSample && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "96px",
            fontWeight: 700,
            color: "rgba(0,0,0,0.08)",
            transform: "rotate(-28deg)",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 50,
            letterSpacing: "0.15em",
          }}
        >
          SAMPLE
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          textAlign: "center",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        送り状
      </div>

      <div
        style={{
          position: "absolute",
          top: mul(60),
          right: mul(12),
          width: mul(60),
          textAlign: "right",
          fontSize: "13px",
          lineHeight: 1.8,
          whiteSpace: "pre-line",
          wordBreak: "break-word",
        }}
      >
        <div>〒{preview.senderZip || "未入力"}</div>
        <div>
          {preview.senderAddress1}
          {preview.senderAddress2 ? `\n${preview.senderAddress2}` : ""}
        </div>
        <div>{preview.senderName}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: mul(12),
          top: mul(38),
          width: mul(95),
          fontSize: "15px",
          lineHeight: 1.7,
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 700 }}>
          {preview.companyName}
        </div>
        {preview.department ? <div>{preview.department}</div> : null}
        <div>{preview.recipientName}</div>
      </div>

      <div
        style={{
          position: "absolute",
          left: mul(12),
          top: mul(106),
          width: mul(168),
          fontSize: "13px",
          lineHeight: 2,
        }}
      >
        {bodySections.map((section, index) => (
          <p
            key={`${index}-${section}`}
            style={{
              margin: index === bodySections.length - 1 ? 0 : "0 0 28px 0",
              whiteSpace: "pre-line",
            }}
          >
            {section}
          </p>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          right: mul(12),
          bottom: mul(12),
          fontSize: "13px",
        }}
      >
        敬具
      </div>
    </>
  );
}