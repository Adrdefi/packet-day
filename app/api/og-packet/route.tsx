import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { resolveMascotUrl } from "@/lib/resolveMascotUrl";
import { GRADE_LABELS } from "@/lib/gradeLabels";
import type { PacketContent } from "@/types";

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

// Mascot-card layout constants, shared between the JSX below and the
// subject-row width budget — the row has to fit the same column the JSX
// actually gives it.
const CARD_WIDTH = 1200;
const CARD_PADDING_X = 90;
// ~11% larger than the original 260px — big enough to compete with the
// Fraunces headline and read at feed-thumbnail size, without narrowing the
// text column enough to push the longest real origin line (Hogwarts
// Legacy and Golf / Cosmo the Caddy Owl, 3 lines at 35px) into a 4th line.
// If the mascot ever grows further, re-check that case before raising this.
const MASCOT_SIZE = 290;
const MASCOT_TEXT_GAP = 56;
const TEXT_COLUMN_WIDTH = CARD_WIDTH - CARD_PADDING_X * 2 - MASCOT_SIZE - MASCOT_TEXT_GAP;

interface PacketOgRow {
  theme: string;
  grade_level: string;
  mascot_image_url: string | null;
  generated_content: PacketContent;
}

// Same sentence the share page renders under its H1 (app/packets/[shareToken]/page.tsx).
// Never touches packet_title/title — those can carry the child's first name,
// which the RPC deliberately never returns anyway.
export function buildOriginLine(theme: string, mascotName: string | undefined): string {
  return mascotName
    ? `A full day built around ${theme}, with ${mascotName} as the guide.`
    : `A full day built around ${theme}.`;
}

// Steps down the same way app/og/blog/[slug]/route.tsx's headlineFontSize
// does, tuned for this card's narrower text column (704px vs. that route's
// 1020px) and for the origin line's longer, template-padded text.
export function originLineFontSize(length: number): number {
  if (length <= 55) return 46;
  if (length <= 75) return 40;
  if (length <= 100) return 35;
  if (length <= 125) return 30;
  return 26;
}

const SUBJECT_ROW_FONT_SIZE = 20;
// Satori has no text-measurement API before layout, so this is a documented
// approximation rather than a real one — ~0.5em average glyph advance width
// is a common rule of thumb for proportional sans-serif faces like Nunito.
const SUBJECT_ROW_CHAR_WIDTH = SUBJECT_ROW_FONT_SIZE * 0.5;
const SUBJECT_ROW_SEPARATOR = " · ";
const SUBJECT_ROW_SUFFIX = " · and more";

// De-duplicates subjects (preserving activity order) and joins them with a
// middot, truncating to whatever fits the given width and appending
// "· and more" rather than clipping mid-word. Returns null when there are
// no subjects at all, so the caller can omit the row instead of leaving a
// gap where it would have been.
export function buildSubjectRow(
  activities: PacketContent["activities"] | undefined,
  maxWidthPx: number
): string | null {
  if (!activities || activities.length === 0) return null;

  const seen = new Set<string>();
  const subjects: string[] = [];
  for (const activity of activities) {
    const subject = activity.subject?.trim();
    if (subject && !seen.has(subject)) {
      seen.add(subject);
      subjects.push(subject);
    }
  }
  if (subjects.length === 0) return null;

  const estimateWidth = (text: string) => text.length * SUBJECT_ROW_CHAR_WIDTH;

  const included: string[] = [];
  for (let i = 0; i < subjects.length; i++) {
    const candidate = [...included, subjects[i]].join(SUBJECT_ROW_SEPARATOR);
    const isLast = i === subjects.length - 1;
    const projectedWidth = estimateWidth(candidate) + (isLast ? 0 : estimateWidth(SUBJECT_ROW_SUFFIX));

    if (projectedWidth <= maxWidthPx || included.length === 0) {
      included.push(subjects[i]);
    } else {
      break;
    }
  }

  const row = included.join(SUBJECT_ROW_SEPARATOR);
  return included.length < subjects.length ? `${row}${SUBJECT_ROW_SUFFIX}` : row;
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
// headline-only layout. The headline is the origin line, not the bare theme
// — "Parrots" is a filing label, "A full day built around Parrots, with
// Pepper as the guide." is a reason to click.
function MascotCard({
  originLine,
  grade,
  subjectRow,
  mascotDataUrl,
}: {
  originLine: string;
  grade: string;
  subjectRow: string | null;
  mascotDataUrl: string;
}) {
  return (
    <div
      style={{
        width: `${CARD_WIDTH}px`,
        height: "630px",
        background: "#FDFBF7",
        display: "flex",
        flexDirection: "column",
        padding: `70px ${CARD_PADDING_X}px`,
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

      {/*
        Vertical centering: two equal flex:1 spacers around the fixed-size
        content row, rather than flex:1 on the row itself. Both approaches
        are mathematically equivalent, but this one doesn't depend on
        alignItems:"center" correctly cross-centering two children of
        different intrinsic heights (mascot vs. text column) against each
        other — it centers the whole row as one block between two anchors
        (brand row above, URL row below) regardless of the row's own height.
      */}
      <div style={{ display: "flex", flex: 1 }} />

      {/* Main content: mascot on the left, text column filling the rest */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: `${MASCOT_TEXT_GAP}px`,
        }}
      >
        <img
          src={mascotDataUrl}
          width={MASCOT_SIZE}
          height={MASCOT_SIZE}
          style={{
            width: `${MASCOT_SIZE}px`,
            height: `${MASCOT_SIZE}px`,
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
            width: `${TEXT_COLUMN_WIDTH}px`,
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
              marginTop: "20px",
              fontSize: `${originLineFontSize(originLine.length)}px`,
              fontWeight: 800,
              fontFamily: "Fraunces",
              color: "#1A1A2E",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {originLine}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "24px",
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
          {subjectRow && (
            <div
              style={{
                display: "flex",
                marginTop: "30px",
                fontSize: `${SUBJECT_ROW_FONT_SIZE}px`,
                fontWeight: 400,
                fontFamily: "Nunito",
                color: "#9CA3AF",
              }}
            >
              {subjectRow}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

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

  const card = mascotDataUrl ? (
    <MascotCard
      originLine={buildOriginLine(theme, packet?.generated_content?.mascot_name)}
      grade={grade}
      subjectRow={buildSubjectRow(packet?.generated_content?.activities, TEXT_COLUMN_WIDTH)}
      mascotDataUrl={mascotDataUrl}
    />
  ) : (
    <TextOnlyCard theme={theme} grade={grade} />
  );

  return new ImageResponse(
    card,
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
