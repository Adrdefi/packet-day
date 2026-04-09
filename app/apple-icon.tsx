import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4A7C59",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            color: "#FDFBF7",
            fontSize: "116px",
            fontWeight: 700,
            lineHeight: 1,
            fontFamily: "Georgia, serif",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}
