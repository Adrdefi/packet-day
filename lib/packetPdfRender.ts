import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import PacketPDF from "@/components/PacketPDF";
import type { PacketPDFProps } from "@/components/PacketPDF";

interface RenderAndCachePacketPdfParams {
  supabase: SupabaseClient;
  packetId: string;
  userId: string;
  props: PacketPDFProps;
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

  const pdfBuffer = await renderToBuffer(
    createElement(PacketPDF, props) as React.ReactElement<PacketPDFProps>
  );

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
      // Fire-and-forget — does not block the caller on this DB round trip.
      supabase
        .from("packets")
        .update({ pdf_url: uploadData.path })
        .eq("id", packetId)
        .then(({ error: pdfUrlUpdateError }) => {
          if (pdfUrlUpdateError) {
            console.error("[packetPdfRender] Failed to save pdf_url after upload:", {
              message: pdfUrlUpdateError.message,
              packetId,
              storagePath,
            });
          }
        });
    }
  } catch (err) {
    console.error("[packetPdfRender] Storage upload threw:", {
      message: err instanceof Error ? err.message : String(err),
      packetId,
      userId,
      storagePath,
    });
  }

  return pdfBuffer;
}
