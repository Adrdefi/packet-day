import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITUATIONS } from "@/lib/situations/registry";

export const runtime = "edge";

async function loadFont(origin: string, filename: string): Promise<ArrayBuffer> {
  const res = await fetch(new URL(`/fonts/${filename}`, origin));
  if (!res.ok) {
    throw new Error(`Failed to load font ${filename}: ${res.status}`);
  }
  return res.arrayBuffer();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const situation = SITUATIONS.find((entry) => entry.slug === slug);

  if (!situation) {
    return new Response("Not found", { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const [frauncesExtraBold, frauncesBold, nunitoRegular, nunitoBold] =
    await Promise.all([
      loadFont(origin, "Fraunces-ExtraBold.ttf"),
      loadFont(origin, "Fraunces-Bold.ttf"),
      loadFont(origin, "Nunito-Regular.ttf"),
      loadFont(origin, "Nunito-Bold.ttf"),
    ]);

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

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: "28px",
            maxWidth: "960px",
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
              fontSize: "96px",
              fontWeight: 800,
              fontFamily: "Fraunces",
              color: "#1A1A2E",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {situation.label}
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 400,
              fontFamily: "Nunito",
              color: "#6B7280",
              lineHeight: 1.45,
              maxWidth: "820px",
            }}
          >
            {situation.teaser}
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
      fonts: [
        { name: "Fraunces", data: frauncesExtraBold, weight: 800, style: "normal" },
        { name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" },
        { name: "Nunito", data: nunitoRegular, weight: 400, style: "normal" },
        { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
      ],
    }
  );
}
