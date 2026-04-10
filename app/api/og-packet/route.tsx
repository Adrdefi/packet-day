import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get("theme") ?? "Learning";
  const grade = searchParams.get("grade") ?? "Grade K";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FDFBF7",
          fontFamily: "Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top color bar */}
        <div
          style={{
            height: "12px",
            background: "linear-gradient(to right, #4A7C59, #D4A843, #E07A5F)",
            width: "100%",
          }}
        />

        {/* Decorative circle top-right */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            backgroundColor: "#4A7C59",
            opacity: 0.06,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            backgroundColor: "#D4A843",
            opacity: 0.08,
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 80px",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#4A7C59",
              letterSpacing: "0.02em",
              marginBottom: "32px",
            }}
          >
            📦 Packet Day
          </div>

          {/* Grade badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              backgroundColor: "#EFF6F1",
              color: "#2E5238",
              fontSize: "18px",
              fontWeight: "600",
              padding: "8px 20px",
              borderRadius: "100px",
              marginBottom: "24px",
              width: "fit-content",
            }}
          >
            🎓 {grade} Learning Packet
          </div>

          {/* Theme headline */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: "900",
              color: "#1A1A2E",
              lineHeight: 1.05,
              marginBottom: "28px",
              maxWidth: "900px",
            }}
          >
            {theme}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: "26px",
              color: "#6B7280",
              lineHeight: 1.4,
            }}
          >
            A full day of AI-powered, personalized homeschool activities.
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            padding: "20px 80px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <div style={{ fontSize: "18px", color: "#6B7280" }}>
            packetday.com
          </div>
          <div
            style={{
              backgroundColor: "#4A7C59",
              color: "#FDFBF7",
              fontSize: "18px",
              fontWeight: "700",
              padding: "12px 28px",
              borderRadius: "12px",
            }}
          >
            Generate free →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
