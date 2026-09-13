import { ImageResponse } from "next/og";
export const alt = "Exit Drill — From treasury risk to verified settlement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 64,
        background: "#f4f4ee",
        color: "#20221f",
        border: "16px solid #20221f",
      }}
    >
      <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>
        ↗ EXIT DRILL
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -3,
          lineHeight: 1.08,
          maxWidth: 1000,
        }}
      >
        From treasury risk to verified settlement.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            background: "#c6f14a",
            padding: "18px 24px",
            border: "3px solid #20221f",
          }}
        >
          Live evidence. Clear limits. Onchain receipts.
        </div>
        <div style={{ display: "flex" }}>Sepolia MVP</div>
      </div>
    </div>,
    size,
  );
}
