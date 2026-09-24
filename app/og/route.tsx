import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export const runtime = "nodejs";
// Nothing on this card changes per request, so render it once at build time.
export const dynamic = "force-static";

const SAGE = "#4A7C59";
const HONEY = "#D4A843";
const CORAL = "#E07A5F";
const CREAM = "#FDFBF7";
const CREAM_DARK = "#F5F0E8";
const DARK = "#1A1A2E";

// Same disk-read pattern as app/og/[slug]/route.tsx. Each path is written out
// literally so Vercel's file tracing bundles these exact files with the function.
const assetsPromise = Promise.all([
  readFile(path.join(process.cwd(), "public", "fonts", "Fraunces-Bold.ttf")),
  readFile(path.join(process.cwd(), "public", "fonts", "Fraunces-BoldItalic.ttf")),
  readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Regular.ttf")),
  readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Bold.ttf")),
  readFile(path.join(process.cwd(), "public", "landing", "oliver", "cover.webp")),
  readFile(path.join(process.cwd(), "public", "landing", "oliver", "coloring.webp")),
  readFile(path.join(process.cwd(), "public", "landing", "oliver", "certificate.webp")),
  readFile(path.join(process.cwd(), "public", "logo-mark.png")),
]);

// Satori can't draw webp, so the packet pages are converted to JPEG data URIs
// (white pages, no transparency needed) at roughly the size they're drawn.
async function pageDataUri(webp: Buffer): Promise<string> {
  const jpeg = await sharp(webp).resize({ width: 560 }).jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

const HEADLINE_WORDS = "Today’s a hard day. Your kids can still learn.".split(" ");

// Portrait packet pages are 1100x1424.
const PAGE_WIDTH = 280;
const PAGE_HEIGHT = Math.round((PAGE_WIDTH * 1424) / 1100);

export async function GET() {
  const [
    frauncesBold,
    frauncesBoldItalic,
    nunitoRegular,
    nunitoBold,
    coverWebp,
    coloringWebp,
    certificateWebp,
    logoMark,
  ] = await assetsPromise;

  const [cover, coloring, certificate] = await Promise.all([
    pageDataUri(coverWebp),
    pageDataUri(coloringWebp),
    pageDataUri(certificateWebp),
  ]);
  const logo = `data:image/png;base64,${logoMark.toString("base64")}`;

  const page = (src: string, left: number, top: number, rotate: number) => (
    <div
      style={{
        position: "absolute",
        left: `${left}px`,
        top: `${top}px`,
        width: `${PAGE_WIDTH}px`,
        height: `${PAGE_HEIGHT}px`,
        display: "flex",
        background: "white",
        borderRadius: "10px",
        overflow: "hidden",
        transform: `rotate(${rotate}deg)`,
        boxShadow: "0 18px 40px rgba(26,26,46,0.22), 0 4px 10px rgba(26,26,46,0.10)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img src={src} width={PAGE_WIDTH} height={PAGE_HEIGHT} />
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Main ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1 }}>
          {/* Left: headline + subline */}
          <div
            style={{
              width: "640px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "0 0 0 72px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                fontFamily: "Fraunces",
                fontWeight: 700,
                fontSize: "66px",
                lineHeight: 1.08,
                color: DARK,
                letterSpacing: "-0.01em",
              }}
            >
              {/* One span per word so Satori wraps between words, not mid-run. */}
              {HEADLINE_WORDS.map((word) => (
                <span
                  key={word}
                  style={
                    word === "still"
                      ? { fontStyle: "italic", color: SAGE, marginRight: "0.24em" }
                      : { marginRight: "0.24em" }
                  }
                >
                  {word}
                </span>
              ))}
            </div>
            <div
              style={{
                marginTop: "28px",
                fontFamily: "Nunito",
                fontWeight: 400,
                fontSize: "31px",
                lineHeight: 1.3,
                color: DARK,
                maxWidth: "540px",
              }}
            >
              A full printable school day built around what your kid loves.
            </div>
          </div>

          {/* Right: fanned real packet pages */}
          <div style={{ display: "flex", flex: 1, position: "relative" }}>
            {page(certificate, 14, 122, -10)}
            {page(coloring, 232, 122, 9)}
            {page(cover, 120, 62, -2)}

            {/* Sticker */}
            <div
              style={{
                position: "absolute",
                right: "16px",
                top: "20px",
                width: "156px",
                height: "156px",
                borderRadius: "9999px",
                background: HONEY,
                border: `5px solid ${CREAM}`,
                boxShadow: "0 8px 20px rgba(26,26,46,0.22)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: "rotate(10deg)",
                fontFamily: "Nunito",
                fontWeight: 700,
                fontSize: "34px",
                lineHeight: 1.05,
                color: DARK,
              }}
            >
              <span>Free to</span>
              <span>start</span>
            </div>
          </div>
        </div>

        {/* ── Bottom strip ─────────────────────────────────────────────── */}
        <div
          style={{
            height: "92px",
            background: CREAM_DARK,
            borderTop: `4px solid ${CORAL}`,
            display: "flex",
            alignItems: "center",
            padding: "0 72px",
            gap: "18px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logo} width={58} height={58} />
          <span
            style={{
              fontFamily: "Nunito",
              fontWeight: 700,
              fontSize: "34px",
              color: SAGE,
            }}
          >
            packetday.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" },
        { name: "Fraunces", data: frauncesBoldItalic, weight: 700, style: "italic" },
        { name: "Nunito", data: nunitoRegular, weight: 400, style: "normal" },
        { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
      ],
    }
  );
}
