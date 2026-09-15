import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { SITUATIONS } from "@/lib/situations/registry";
import { OG_HEADLINES } from "@/lib/situations/og-content";

export const runtime = "nodejs";

function loadFont(filename: string): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "fonts", filename));
}

// Read once per server instance and reused across requests — same file,
// same bytes, no reason to hit disk again on every image render.
const fontsPromise = Promise.all([
  loadFont("Fraunces-ExtraBold.ttf"),
  loadFont("Fraunces-Bold.ttf"),
  loadFont("Nunito-Regular.ttf"),
  loadFont("Nunito-Bold.ttf"),
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const situation = SITUATIONS.find((entry) => entry.slug === slug);

  if (!situation) {
    return new Response("Not found", { status: 404 });
  }

  // Falls back to the short registry label only if a slug is ever missing
  // from OG_HEADLINES — keeps the image rendering instead of erroring.
  const headline = OG_HEADLINES[situation.slug] ?? situation.label;

  const [frauncesExtraBold, frauncesBold, nunitoRegular, nunitoBold] =
    await fontsPromise;

  // Situation headlines vary a lot in length (road-trip's is 60 characters,
  // fun-friday's is 79) — a fixed font size that fit the shorter ones would
  // clip or overflow the longer ones now that the emoji badge has also
  // narrowed the available text column. Same scaling approach as
  // app/og/blog/[slug]/route.tsx's headlineFontSize, tuned to this route's
  // own headline lengths instead of blog titles'.
  const fontSize =
    headline.length <= 45 ? 60 : headline.length <= 60 ? 54 : headline.length <= 72 ? 46 : 40;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#FDFBF7",
          display: "flex",
          flexDirection: "column",
          padding: "70px 90px",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#4A7C59",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#FDFBF7",
                fontSize: "32px",
                fontWeight: 700,
                fontFamily: "Nunito",
                lineHeight: 1,
              }}
            >
              P
            </span>
          </div>
          <span
            style={{
              fontSize: "30px",
              fontWeight: 700,
              fontFamily: "Fraunces",
              color: "#1A1A2E",
            }}
          >
            Packet Day
          </span>
        </div>

        {/* Main content — situation emoji badge beside the headline column */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
            gap: "40px",
            maxWidth: "1020px",
          }}
        >
          <div
            style={{
              width: "140px",
              height: "140px",
              borderRadius: "9999px",
              background: "#F5F0E8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "76px",
              flexShrink: 0,
            }}
          >
            {situation.emoji}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              maxWidth: "840px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "6px",
                borderRadius: "3px",
                background: "#D4A843",
              }}
            />
            <div
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: 800,
                fontFamily: "Fraunces",
                color: "#1A1A2E",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {headline}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: 400,
              fontFamily: "Nunito",
              color: "#9CA3AF",
            }}
          >
            www.packetday.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Built-in emoji rasterization (next/og's ImageResponse option) rather
      // than a custom font — the situation emoji (🛋️, 🚗, 🍕) render as color
      // glyphs Satori can't otherwise draw from the Fraunces/Nunito files
      // loaded above.
      emoji: "twemoji",
      fonts: [
        { name: "Fraunces", data: frauncesExtraBold, weight: 800, style: "normal" },
        { name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" },
        { name: "Nunito", data: nunitoRegular, weight: 400, style: "normal" },
        { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
      ],
    }
  );
}
