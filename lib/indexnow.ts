import { SITE_URL } from "./site";

/**
 * IndexNow key for www.packetday.com. Public by design: search engines
 * verify it by fetching public/<key>.txt, whose only content is this key.
 * If you ever rotate it, rename that file to match.
 */
export const INDEXNOW_KEY = "419fe3579dcf1358e9e206cf65fbeb8c";

/** Always the www host, never the apex: that's the site's official address. */
export const INDEXNOW_HOST = new URL(SITE_URL).host;

export const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
