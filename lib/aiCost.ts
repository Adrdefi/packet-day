import { CLAUDE_PRICES_PER_MTOK, IMAGE_PRICES_PER_IMAGE } from "@/lib/config";

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface ImageUsage {
  /** Replicate ref as sent, e.g. "owner/name:versionhash". Null if skipped. */
  model: string | null;
  /** Every attempt counts as billed, including timed-out ones. */
  attempts: number;
}

/** "owner/name:version" → "owner/name", the key IMAGE_PRICES_PER_IMAGE uses. */
function imagePriceKey(model: string): string {
  return model.split(":")[0];
}

/**
 * Estimated USD cost of one packet from its real usage numbers. Returns null
 * if any model involved isn't in the price table — an unknown price is
 * reported as unknown, never guessed as zero.
 */
export function estimatePacketCostUsd(
  claudeModel: string,
  claude: ClaudeUsage,
  images: ImageUsage[]
): number | null {
  const claudePrice = CLAUDE_PRICES_PER_MTOK[claudeModel];
  if (!claudePrice) return null;

  let total =
    (claude.inputTokens * claudePrice.input +
      claude.outputTokens * claudePrice.output +
      claude.cacheReadTokens * claudePrice.cacheRead +
      claude.cacheWriteTokens * claudePrice.cacheWrite) /
    1_000_000;

  for (const image of images) {
    if (!image.model || image.attempts === 0) continue;
    const perImage = IMAGE_PRICES_PER_IMAGE[imagePriceKey(image.model)];
    if (perImage === undefined) return null;
    total += perImage * image.attempts;
  }

  return total;
}
