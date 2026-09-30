import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { SAMPLE_CHILD, SAMPLE_GRADE, SAMPLE_PAGES } from "@/lib/sample/content";

export const runtime = "nodejs";
// The /sample share card, drawn with Kai's real cover. Same layout as the
// unit study cards (app/og/unit-studies/[slug]), built once at build time.
export const dynamic = "force-static";

const SAGE = "#4A7C59";
const HONEY = "#D4A843";
const CREAM = "#FDFBF7";
const DARK = "#1A1A2E";

// Same disk-read pattern as app/og/route.tsx.
const assetsPromise = Promise.all([
  readFile(path.join(process.cwd(), "public", "fonts", "Fraunces-Bold.ttf")),
  readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Regular.ttf")),
  readFile(path.join(process.cwd(), "public", "fonts", "Nunito-Bold.ttf")),
  readFile(path.join(process.cwd(), "public", "logo-mark.png")),
]);

// The cover is a 1200x1553 packet page, drawn at this size.
const COVER_WIDTH = 380;
const COVER_HEIGHT = Math.round((COVER_WIDTH * 1553) / 1200);

export async function GET() {
  const [frauncesBold, nunitoRegular, nunitoBold, logoMark] = await assetsPromise;
  const coverPng = await readFile(path.join(process.cwd(), "public", SAMPLE_PAGES[0].src));
  // JPEG data URI at roughly the drawn size keeps the card small.
  const coverJpeg = await sharp(coverPng).resize({ width: COVER_WIDTH * 2 }).jpeg({ quality: 85 }).toBuffer();
  const cover = `data:image/jpeg;base64,${coverJpeg.toString("base64")}`;
  const logo = `data:image/png;base64,${logoMark.toString("base64")}`;
  const headlineWords = "Flip through a real sample packet".split(" ");

  return new ImageResponse(
    (
      <div style={{ width: "1200px", height: "630px", background: CREAM, display: "flex" }}>
        <div
          style={{
            width: "700px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 0 0 72px",
          }}
        >
          <div
            style={{
              fontFamily: "Nunito",
              fontWeight: 700,
              fontSize: "24px",
              letterSpacing: "0.12em",
              color: SAGE,
              textTransform: "uppercase",
            }}
          >
            Sample packet
          </div>
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexWrap: "wrap",
              fontFamily: "Fraunces",
              fontWeight: 700,
              fontSize: "64px",
              lineHeight: 1.08,
              color: DARK,
            }}
          >
            {/* One span per word so Satori wraps between words. */}
            {headlineWords.map((word, i) => (
              <span key={i} style={{ marginRight: "0.24em" }}>
                {word}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: "24px",
              fontFamily: "Nunito",
              fontWeight: 400,
              fontSize: "30px",
              lineHeight: 1.3,
              color: DARK,
              maxWidth: "560px",
            }}
          >
            {`Every page of an outer space day made for a grade ${SAMPLE_GRADE} learner named ${SAMPLE_CHILD}.`}
          </div>
          <div style={{ marginTop: "36px", display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={54} height={54} />
            <span style={{ fontFamily: "Nunito", fontWeight: 700, fontSize: "32px", color: SAGE }}>packetday.com</span>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "40px",
              top: "70px",
              width: `${COVER_WIDTH}px`,
              height: `${COVER_HEIGHT}px`,
              display: "flex",
              background: "white",
              borderRadius: "10px",
              overflow: "hidden",
              transform: "rotate(3deg)",
              boxShadow: "0 18px 40px rgba(26,26,46,0.22), 0 4px 10px rgba(26,26,46,0.10)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={cover} width={COVER_WIDTH} height={COVER_HEIGHT} />
          </div>
          <div
            style={{
              position: "absolute",
              right: "36px",
              top: "36px",
              width: "146px",
              height: "146px",
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
              fontSize: "32px",
              lineHeight: 1.05,
              color: DARK,
            }}
          >
            <span>Free to</span>
            <span>start</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Fraunces", data: frauncesBold, weight: 700, style: "normal" },
        { name: "Nunito", data: nunitoRegular, weight: 400, style: "normal" },
        { name: "Nunito", data: nunitoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
