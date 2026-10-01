import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import PacketPDF from "@/components/PacketPDF";
import type { PacketPDFProps } from "@/components/PacketPDF";
import { checkGlyphCacheAfterRender, prepareFontsForRender } from "@/lib/pdfGlyphCache";

interface RenderAndCachePacketPdfParams {
  supabase: SupabaseClient;
  packetId: string;
  userId: string;
  props: PacketPDFProps;
}

// ─── Filename helpers ───────────────────────────────────────────────────────
// Shared by generate-pdf (download Content-Disposition) and generate-packet
// (the packet-ready email attachment) so both produce the identical
// human-readable filename for the same packet.

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildFilename(childName: string, theme: string, date: string): string {
  const d = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `${slugify(childName)}-${slugify(theme)}-${d}.pdf`;
}

/**
 * The one render path for a packet PDF. Every caller (generate-pdf, the
 * generate-packet pre-render, dev-render-packet, and the scripts) goes
 * through here so the stale glyph guard in lib/pdfGlyphCache.ts always runs:
 * fonts are warmed before the render and the glyph cache is checked after
 * it. Neither step can fail the render. `packetId` only labels log lines.
 */
export async function renderPacketPdf(props: PacketPDFProps, packetId: string): Promise<Uint8Array> {
  // Packets made before puzzle rotation render exactly as always: one pass,
  // kid footers at "totalPages minus one" (wrong when their parent sheet runs
  // to two pages; see docs/WAITING_FIXES.md).
  if (!props.activities.some((a) => !!a.puzzle?.data)) return renderOnce(props, packetId);

  // Puzzle packets: the parent sheet may flow onto a second page. Render
  // once; only if the sheet wasn't exactly one page, render again with the
  // real kid page total. Packets whose sheet fits pay nothing extra.
  let sheetPages: number | null = null;
  let totalPages: number | null = null;
  const first = await renderOnce(
    {
      ...props,
      onParentSheetPages: (sheet, total) => {
        sheetPages = sheet;
        totalPages = total;
      },
    },
    packetId
  );
  if (sheetPages === null || totalPages === null || sheetPages === 1) return first;
  return renderOnce({ ...props, kidPageTotal: (totalPages as number) - (sheetPages as number) }, packetId);
}

async function renderOnce(props: PacketPDFProps, packetId: string): Promise<Uint8Array> {
  await prepareFontsForRender(packetId);
  try {
    return await renderToBuffer(createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>);
  } finally {
    checkGlyphCacheAfterRender(packetId);
  }
}

/**
 * Renders a packet's PDF and best-effort uploads it to Storage at
 * `${userId}/${packetId}.pdf`, updating packets.pdf_url on success.
 *
 * `supabase` MUST be a session-bound client whose auth.uid() equals `userId`.
 * The storage RLS policy on the "packets" bucket scopes writes by the
 * object path's first segment (`${userId}/...`) matching auth.uid() — a
 * service-role client bypasses RLS entirely and would silently succeed
 * writing to a mismatched path if `userId` were ever wrong, with nothing
 * to catch the mistake. The RLS check is the safety net; it only exists
 * for a session-bound client.
 *
 * Storage/DB failures are logged and swallowed here — caching is optional
 * and must never surface to the caller. A render failure is NOT swallowed;
 * it propagates, because the two callers need different responses to that
 * specific failure (generate-pdf returns a 500; generate-packet must not
 * fail the whole generation request over a pre-caching step).
 */
export async function renderAndCachePacketPdf(
  params: RenderAndCachePacketPdfParams
): Promise<Uint8Array> {
  const { supabase, packetId, userId, props } = params;

  const pdfBuffer = await renderPacketPdf(props, packetId);

  const storagePath = `${userId}/${packetId}.pdf`;
  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("packets")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("[packetPdfRender] Storage upload failed:", {
        message: uploadError?.message,
        packetId,
        userId,
        storagePath,
      });
    } else {
      // Awaited, not fire-and-forget: a route can return right after this,
      // and on Vercel an unawaited write may never run, leaving an uploaded
      // PDF that pdf_url never points to. A thrown error lands in the catch
      // below, so this still can never break the caller.
      const { error: pdfUrlUpdateError } = await supabase
        .from("packets")
        .update({ pdf_url: uploadData.path })
        .eq("id", packetId);
      if (pdfUrlUpdateError) {
        console.error("[packetPdfRender] Failed to save pdf_url after upload:", {
          message: pdfUrlUpdateError.message,
          packetId,
          storagePath,
        });
      }
    }
  } catch (err) {
    console.error("[packetPdfRender] Storage upload or pdf_url save threw:", {
      message: err instanceof Error ? err.message : String(err),
      packetId,
      userId,
      storagePath,
    });
  }

  return pdfBuffer;
}
