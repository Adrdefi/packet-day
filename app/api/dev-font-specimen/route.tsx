// THROWAWAY dev-only route for visual font-glyph verification during the
// PDF token rebuild (chunk 2, stage 1). Exercises the newly registered
// Fraunces 800 and Nunito 600 weights directly, side by side with the
// existing weights, on punctuation-heavy text — since no production style
// uses these weights yet (that's stage 3). Delete before merging.

import { NextRequest } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
// Side-effect import: registers the Nunito/Fraunces families (incl. the new
// 600/800 weights) exactly as the real template does.
import "@/components/PacketPDF";

export const runtime = "nodejs";

const s = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#FFFFFF", flexDirection: "column" },
  row: { flexDirection: "column", marginBottom: 14 },
  label: { fontFamily: "Nunito", fontWeight: 400, fontSize: 9, color: "#8B837B", marginBottom: 2 },
  fraunces400: { fontFamily: "Fraunces", fontWeight: 400, fontSize: 22, color: "#3A3633" },
  fraunces700: { fontFamily: "Fraunces", fontWeight: 700, fontSize: 22, color: "#3A3633" },
  fraunces800: { fontFamily: "Fraunces", fontWeight: 800, fontSize: 22, color: "#3A3633" },
  nunito400: { fontFamily: "Nunito", fontWeight: 400, fontSize: 14, color: "#3A3633" },
  nunito600: { fontFamily: "Nunito", fontWeight: 600, fontSize: 14, color: "#3A3633" },
  nunito700: { fontFamily: "Nunito", fontWeight: 700, fontSize: 14, color: "#3A3633" },
  inline: { flexDirection: "row", alignItems: "baseline" },
  inlineItem: { marginRight: 14 },
});

const SPECIMEN = "Oliver's “best day” & the treasure map — 5 min · 10 min";

function Row({ label, style, text }: { label: string; style: object; text: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={style as any}>{text}</Text>
    </View>
  );
}

function Specimen() {
  return (
    <Document title="Font specimen">
      <Page size="LETTER" style={s.page}>
        <Row label="Fraunces 400 (existing, unchanged)" style={s.fraunces400} text={SPECIMEN} />
        <Row label="Fraunces 700 (existing, unchanged)" style={s.fraunces700} text={SPECIMEN} />
        <Row label="Fraunces 800 (NEW)" style={s.fraunces800} text={SPECIMEN} />
        <Row label="Nunito 400 (regenerated static instance)" style={s.nunito400} text={SPECIMEN} />
        <Row label="Nunito 600 (NEW)" style={s.nunito600} text={SPECIMEN} />
        <Row label="Nunito 700 (regenerated static instance)" style={s.nunito700} text={SPECIMEN} />

        <View style={{ marginTop: 12 }}>
          <Text style={s.label}>Direct weight contrast on one line — regular / semibold / bold:</Text>
          <View style={s.inline}>
            <Text style={[s.nunito400, s.inlineItem]}>regular</Text>
            <Text style={[s.nunito600, s.inlineItem]}>semibold</Text>
            <Text style={[s.nunito700, s.inlineItem]}>bold</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function GET(_req: NextRequest) {
  const buf = await renderToBuffer(<Specimen />);
  return new Response(buf.buffer as ArrayBuffer, {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  });
}
