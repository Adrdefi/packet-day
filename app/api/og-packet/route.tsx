import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";
import { GRADE_LABELS } from "@/lib/gradeLabels";

export const runtime = "nodejs";

// Same disk-read pattern as app/og/[slug]/route.tsx and app/og/blog/[slug]/route.tsx
// — this route used to be edge runtime and fetch these over HTTP, which broke on
// Vercel preview deployments sitting behind Vercel Authentication (see commit
// ec11b2f). Read once per server instance and reused across requests.
function loadFont(filename: string): Promise<Buffer> {
  return readFile(path.join(process.cwd(), "public", "fonts", filename));
}

const fontsPromise = Promise.all([
  loadFont("Fraunces-ExtraBold.ttf"),
  loadFont("Fraunces-Bold.ttf"),
  loadFont("Nunito-Regular.ttf"),
  loadFont("Nunito-Bold.ttf"),
]);

const RPC_TIMEOUT_MS = 3000;
const MASCOT_FETCH_TIMEOUT_MS = 3000;

interface PacketOgRow {
  theme: string;
  grade_level: string;
  mascot_image_url: string | null;
}

// Single attempt, bounded by its own timeout — a slow or failing RPC must
// never hold up the image response. Any failure just means "render the
// generic card," never a retry, never a thrown error.
async function fetchPacketForOg(shareToken: string): Promise<PacketOgRow | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_packet_by_share_token", { token: shareToken })
      .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));

    if (error) {
      console.error("[og-packet] get_packet_by_share_token failed", { message: error.message });
      return null;
    }

    return data?.[0] ?? null;
  } catch (err) {
    console.error("[og-packet] get_packet_by_share_token threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// Single attempt, bounded by its own timeout, same policy as the RPC call
// above. Fetches the bytes ourselves rather than handing satori a remote
// <img src> — a failure here is visible in our own logs and bounded by our
// own timeout, instead of being satori's problem to swallow.
async function fetchMascotDataUrl(mascotUrl: string): Promise<string | null> {
  try {
    const response = await fetch(mascotUrl, {
      signal: AbortSignal.timeout(MASCOT_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("[og-packet] Mascot fetch failed", { status: response.status });
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/png";
    return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
  } catch (err) {
    console.error("[og-packet] Mascot fetch threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function TextOnlyCard({ theme, grade }: { theme: string; grade: string }) {
  return (
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
          Packet Day
        </div>

        {/* Grade badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#EFF6F1",
            color: "#2E5238",
            fontSize: "18px",
            fontWeight: "600",
            padding: "8px 20px",
            borderRadius: "100px",
            marginBottom: "24px",
            alignSelf: "flex-start",
          }}
        >
          {grade} Learning Packet
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
        <div style={{ fontSize: "18px", color: "#6B7280" }}>packetday.com</div>
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
  );
}

// Same brand row / gold accent bar / Fraunces headline / bottom-right domain
// pattern established by app/og/[slug]/route.tsx and app/og/blog/[slug]/route.tsx,
// with the mascot seated alongside the text instead of those routes' plain
// headline-only layout.
function MascotCard({
  theme,
  grade,
  mascotDataUrl,
}: {
  theme: string;
  grade: string;
  mascotDataUrl: string;
}) {
  return (
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

      {/* Main content: mascot alongside text */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: "56px",
        }}
      >
        <img
          src={mascotDataUrl}
          width={260}
          height={260}
          style={{
            width: "260px",
            height: "260px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "6px solid white",
            boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            gap: "20px",
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
              fontSize: "56px",
              fontWeight: 800,
              fontFamily: "Fraunces",
              color: "#1A1A2E",
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {theme}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#EFF6F1",
              color: "#2E5238",
              fontSize: "20px",
              fontWeight: 600,
              fontFamily: "Nunito",
              padding: "10px 22px",
              borderRadius: "100px",
              alignSelf: "flex-start",
            }}
          >
            {grade} Learning Packet
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
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
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shareToken = searchParams.get("token");

  const packet = shareToken ? await fetchPacketForOg(shareToken) : null;

  const theme = packet?.theme ?? "Learning";
  const grade = packet
    ? (GRADE_LABELS[packet.grade_level] ?? `Grade ${packet.grade_level}`)
    : "Grade K";

  const mascotUrl = packet ? resolveMascotUrl(packet.mascot_image_url) : null;
  const mascotDataUrl = mascotUrl ? await fetchMascotDataUrl(mascotUrl) : null;

  const [frauncesExtraBold, frauncesBold, nunitoRegular, nunitoBold] = await fontsPromise;

  return new ImageResponse(
    mascotDataUrl ? (
      <MascotCard theme={theme} grade={grade} mascotDataUrl={mascotDataUrl} />
    ) : (
      <TextOnlyCard theme={theme} grade={grade} />
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
