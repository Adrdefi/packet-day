import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#FDFBF7",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
        }}
      >
        {/* ── Main content ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "56px 64px",
            gap: "56px",
            alignItems: "center",
          }}
        >
          {/* Left — branding + tagline */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0px",
            }}
          >
            {/* Logo mark */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
                marginBottom: "28px",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  background: "#4A7C59",
                  borderRadius: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "#FDFBF7",
                    fontSize: "42px",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  P
                </span>
              </div>
              <span
                style={{
                  fontSize: "46px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  letterSpacing: "-0.02em",
                }}
              >
                Packet Day
              </span>
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: "30px",
                color: "#4A7C59",
                fontWeight: 600,
                marginBottom: "20px",
                lineHeight: 1.2,
              }}
            >
              Your backup plan for the hard days.
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: "19px",
                color: "#6B7280",
                lineHeight: 1.6,
                maxWidth: "460px",
                marginBottom: "36px",
              }}
            >
              AI-powered learning packets for homeschool families —
              personalized, printable, in 60 seconds.
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "40px" }}>
              {[
                { stat: "K–8th", label: "Grades" },
                { stat: "60 sec", label: "To Generate" },
                { stat: "∞", label: "Themes" },
                { stat: "Free", label: "To Start" },
              ].map(({ stat, label }) => (
                <div
                  key={label}
                  style={{ display: "flex", flexDirection: "column", gap: "4px" }}
                >
                  <span
                    style={{
                      fontSize: "26px",
                      fontWeight: 700,
                      color: "#4A7C59",
                      lineHeight: 1,
                    }}
                  >
                    {stat}
                  </span>
                  <span style={{ fontSize: "13px", color: "#9CA3AF" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock packet card */}
          <div
            style={{
              width: "430px",
              background: "white",
              borderRadius: "24px",
              padding: "28px",
              border: "2px solid #E5E7EB",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginBottom: "6px",
                paddingBottom: "14px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#1A1A2E",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🦕</span>
                <span>Dinosaur Day</span>
              </div>
              <div style={{ fontSize: "14px", color: "#6B7280" }}>
                For Emma · Grade 3 · Full Day Packet
              </div>
            </div>

            {/* Activity blocks */}
            {[
              {
                label: "Math",
                bg: "#E8F4ED",
                color: "#2E5238",
                text: "Measuring dinosaurs & timeline math",
                dot: "#4A7C59",
              },
              {
                label: "Reading",
                bg: "#FDF5E0",
                color: "#7A5C10",
                text: "Dino facts passage + comprehension",
                dot: "#D4A843",
              },
              {
                label: "Science",
                bg: "#FCE8E2",
                color: "#7A3520",
                text: "Fossil dig & herbivore vs. carnivore sort",
                dot: "#E07A5F",
              },
              {
                label: "Art + PE",
                bg: "#EEF2FF",
                color: "#3730A3",
                text: "Draw your dino + Dino Stomp break",
                dot: "#6366F1",
              },
            ].map(({ label, bg, color, text, dot }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  borderRadius: "12px",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: dot,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "#374151" }}>{text}</span>
              </div>
            ))}

            {/* Footer note */}
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                textAlign: "center",
                paddingTop: "8px",
                borderTop: "1px solid #F3F4F6",
              }}
            >
              Answer key included · Print-ready PDF
            </div>
          </div>
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────────── */}
        <div
          style={{
            height: "70px",
            background: "#4A7C59",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <span style={{ color: "white", fontSize: "22px", fontWeight: 700 }}>
            packetday.com
          </span>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "18px" }}>
            ·
          </span>
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "17px" }}>
            Free to start — no card needed
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
