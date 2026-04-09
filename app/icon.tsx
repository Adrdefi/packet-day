import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "7px",
        }}
      >
        <span
          style={{
            color: "#FDFBF7",
            fontSize: "22px",
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
